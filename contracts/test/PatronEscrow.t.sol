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

    function testTipUnclaimed() public {
        vm.prank(listener);
        escrow.deposit(10e6);

        vm.prank(listener);
        escrow.tip(mbidHash, 50000); // $0.05

        assertEq(escrow.listenerBalance(listener), 10e6 - 50000);
        assertEq(escrow.unclaimedBalance(mbidHash), 50000);
        assertEq(escrow.totalTipped(listener), 50000);
    }

    function testTipVerifiedArtist() public {
        // Setup: claim and verify
        vm.prank(artist);
        escrow.claimArtist(mbidHash);
        escrow.verifyAndRelease(mbidHash); // owner call

        // Deposit and tip
        vm.prank(listener);
        escrow.deposit(10e6);

        vm.prank(listener);
        escrow.tip(mbidHash, 50000);

        // Tip should go directly to artist
        assertEq(usdc.balanceOf(artist), 50000);
        assertEq(escrow.unclaimedBalance(mbidHash), 0);
    }

    function testTipDefault() public {
        vm.prank(listener);
        escrow.deposit(10e6);

        vm.prank(listener);
        escrow.tipDefault(mbidHash);

        assertEq(escrow.unclaimedBalance(mbidHash), 50000); // default tip amount
        assertEq(escrow.totalTipped(listener), 50000);
    }

    function testTipInsufficientBalance() public {
        vm.prank(listener);
        vm.expectRevert("Insufficient balance");
        escrow.tip(mbidHash, 50000);
    }

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

    function testSetDefaultTipAmount() public {
        escrow.setDefaultTipAmount(100000); // $0.10
        assertEq(escrow.defaultTipAmount(), 100000);
    }

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
