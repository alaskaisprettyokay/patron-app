// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PatronEscrow.sol";
import "../src/MockUSDC.sol";

contract PatronEscrowTest is Test {
    PatronEscrow escrow;
    MockUSDC usdc;

    address owner = address(this);
    address listener = address(0x1);
    address artist = address(0x2);
    address attestor1 = address(0x10);
    address attestor2 = address(0x11);
    address attestor3 = address(0x12);

    bytes32 mbidHash = keccak256("test-mbid-1234");

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new PatronEscrow(address(usdc));

        // Fund listener
        usdc.mint(listener, 100e6); // 100 USDC

        // Approve escrow
        vm.prank(listener);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // --- Deposit / Withdraw ---

    function testDeposit() public {
        vm.prank(listener);
        escrow.deposit(10e6);
        assertEq(escrow.listenerBalance(listener), 10e6);
        assertEq(usdc.balanceOf(address(escrow)), 10e6);
    }

    function testWithdraw() public {
        vm.prank(listener);
        escrow.deposit(10e6);

        vm.prank(listener);
        escrow.withdraw(5e6);
        assertEq(escrow.listenerBalance(listener), 5e6);
        assertEq(usdc.balanceOf(listener), 95e6);
    }

    function testWithdrawInsufficientBalance() public {
        vm.prank(listener);
        escrow.deposit(5e6);

        vm.prank(listener);
        vm.expectRevert("Insufficient balance");
        escrow.withdraw(10e6);
    }

    // --- Tipping ---

    function testTipUnclaimed() public {
        vm.prank(listener);
        escrow.deposit(10e6);

        vm.prank(listener);
        escrow.tip(mbidHash, 10000); // $0.01

        assertEq(escrow.listenerBalance(listener), 10e6 - 10000);
        assertEq(escrow.unclaimedBalance(mbidHash), 10000);
        assertEq(escrow.totalTipped(listener), 10000);
    }

    function testTipVerifiedArtist() public {
        // Setup: claim and verify via owner
        vm.prank(artist);
        escrow.claimArtist(mbidHash);
        escrow.verifyAndRelease(mbidHash); // owner call

        // Deposit and tip
        vm.prank(listener);
        escrow.deposit(10e6);

        vm.prank(listener);
        escrow.tip(mbidHash, 10000);

        // Tip should go directly to artist
        assertEq(usdc.balanceOf(artist), 10000);
        assertEq(escrow.unclaimedBalance(mbidHash), 0);
    }

    function testTipDefault() public {
        vm.prank(listener);
        escrow.deposit(10e6);

        vm.prank(listener);
        escrow.tipDefault(mbidHash);

        assertEq(escrow.unclaimedBalance(mbidHash), 10000); // default tip amount
        assertEq(escrow.totalTipped(listener), 10000);
    }

    function testTipInsufficientBalance() public {
        vm.prank(listener);
        vm.expectRevert("Insufficient balance");
        escrow.tip(mbidHash, 10000);
    }

    // --- Artist claim ---

    function testClaimArtist() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);
        assertEq(escrow.artistWallet(mbidHash), artist);
    }

    function testClaimArtistAlreadyClaimed() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        vm.prank(address(0x3));
        vm.expectRevert("Already claimed");
        escrow.claimArtist(mbidHash);
    }

    // --- Owner verify (backwards compat) ---

    function testVerifyAndRelease() public {
        // Escrow some funds first
        vm.prank(listener);
        escrow.deposit(10e6);
        vm.prank(listener);
        escrow.tip(mbidHash, 1e6);

        // Claim
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        // Verify and release
        escrow.verifyAndRelease(mbidHash);

        assertTrue(escrow.isVerified(mbidHash));
        assertEq(escrow.unclaimedBalance(mbidHash), 0);
        assertEq(usdc.balanceOf(artist), 1e6);
    }

    function testVerifyAndReleaseNotOwner() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        vm.prank(listener);
        vm.expectRevert();
        escrow.verifyAndRelease(mbidHash);
    }

    function testVerifyAndReleaseNotClaimed() public {
        vm.expectRevert("Not claimed");
        escrow.verifyAndRelease(mbidHash);
    }

    // --- Verification challenge ---

    function testGetVerificationChallenge() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        bytes32 challenge = escrow.getVerificationChallenge(mbidHash);
        bytes32 expected = keccak256(abi.encodePacked(mbidHash, artist, "patron-verify"));
        assertEq(challenge, expected);
    }

    function testGetVerificationChallengeNotClaimed() public {
        vm.expectRevert("Not claimed");
        escrow.getVerificationChallenge(mbidHash);
    }

    // --- Attestor management ---

    function testAddAttestor() public {
        escrow.addAttestor(attestor1);
        assertTrue(escrow.isAttestor(attestor1));
        assertEq(escrow.attestorCount(), 1);
    }

    function testAddAttestorAlreadyAttestor() public {
        escrow.addAttestor(attestor1);
        vm.expectRevert("Already attestor");
        escrow.addAttestor(attestor1);
    }

    function testAddAttestorNotOwner() public {
        vm.prank(listener);
        vm.expectRevert();
        escrow.addAttestor(attestor1);
    }

    function testRemoveAttestor() public {
        escrow.addAttestor(attestor1);
        escrow.removeAttestor(attestor1);
        assertFalse(escrow.isAttestor(attestor1));
        assertEq(escrow.attestorCount(), 0);
    }

    function testRemoveAttestorNotAttestor() public {
        vm.expectRevert("Not attestor");
        escrow.removeAttestor(attestor1);
    }

    function testSetAttestationThreshold() public {
        escrow.setAttestationThreshold(3);
        assertEq(escrow.attestationThreshold(), 3);
    }

    function testSetAttestationThresholdZero() public {
        vm.expectRevert("Threshold must be > 0");
        escrow.setAttestationThreshold(0);
    }

    // --- Attestation-based verification ---

    function testAttestVerificationSingleAttestor() public {
        // Add attestor and claim artist
        escrow.addAttestor(attestor1);
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        // Escrow some funds
        vm.prank(listener);
        escrow.deposit(10e6);
        vm.prank(listener);
        escrow.tip(mbidHash, 1e6);

        // Single attestation (threshold=1) should auto-verify
        vm.prank(attestor1);
        escrow.attestVerification(mbidHash);

        assertTrue(escrow.isVerified(mbidHash));
        assertEq(escrow.unclaimedBalance(mbidHash), 0);
        assertEq(usdc.balanceOf(artist), 1e6);
        assertEq(escrow.attestationCount(mbidHash), 1);
    }

    function testAttestVerificationMultiAttestor() public {
        // Set threshold to 2-of-3
        escrow.addAttestor(attestor1);
        escrow.addAttestor(attestor2);
        escrow.addAttestor(attestor3);
        escrow.setAttestationThreshold(2);

        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        vm.prank(listener);
        escrow.deposit(10e6);
        vm.prank(listener);
        escrow.tip(mbidHash, 1e6);

        // First attestation — not yet verified
        vm.prank(attestor1);
        escrow.attestVerification(mbidHash);
        assertFalse(escrow.isVerified(mbidHash));
        assertEq(escrow.attestationCount(mbidHash), 1);

        // Second attestation — threshold met, auto-verified
        vm.prank(attestor2);
        escrow.attestVerification(mbidHash);
        assertTrue(escrow.isVerified(mbidHash));
        assertEq(usdc.balanceOf(artist), 1e6);
        assertEq(escrow.attestationCount(mbidHash), 2);
    }

    function testAttestVerificationNotAttestor() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        vm.prank(listener);
        vm.expectRevert("Not an attestor");
        escrow.attestVerification(mbidHash);
    }

    function testAttestVerificationNotClaimed() public {
        escrow.addAttestor(attestor1);

        vm.prank(attestor1);
        vm.expectRevert("Not claimed");
        escrow.attestVerification(mbidHash);
    }

    function testAttestVerificationAlreadyVerified() public {
        escrow.addAttestor(attestor1);
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        // Owner directly verifies
        escrow.verifyAndRelease(mbidHash);

        vm.prank(attestor1);
        vm.expectRevert("Already verified");
        escrow.attestVerification(mbidHash);
    }

    function testAttestVerificationDoubleAttest() public {
        escrow.addAttestor(attestor1);
        escrow.setAttestationThreshold(2);
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        vm.prank(attestor1);
        escrow.attestVerification(mbidHash);

        vm.prank(attestor1);
        vm.expectRevert("Already attested");
        escrow.attestVerification(mbidHash);
    }

    // --- Config ---

    function testSetDefaultTipAmount() public {
        escrow.setDefaultTipAmount(100000); // $0.10
        assertEq(escrow.defaultTipAmount(), 100000);
    }

    // --- View helpers ---

    function testGetArtistInfo() public {
        vm.prank(listener);
        escrow.deposit(10e6);
        vm.prank(listener);
        escrow.tip(mbidHash, 50000);

        (address wallet, bool verified, uint256 unclaimed) = escrow.getArtistInfo(mbidHash);
        assertEq(wallet, address(0));
        assertFalse(verified);
        assertEq(unclaimed, 50000);
    }
}
