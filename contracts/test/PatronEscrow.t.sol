// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../src/PatronEscrow.sol";
import "../src/PatronSmartAccount.sol";
import "../src/MockUSDC.sol";

contract PatronEscrowTest is Test {
    PatronEscrow escrow;
    MockUSDC usdc;

    address owner = address(this);
    address listener = address(0x1);
    address listener2 = address(0x3);
    address artist = address(0x2);

    bytes32 mbidHash = keccak256("test-mbid-1234");
    bytes32 otherMbid = keccak256("other-mbid");

    uint256 constant SESSION_PRIV_KEY = 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef;
    uint256 constant SESSION_PRIV_KEY_2 = 0xcafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe;
    address sessionKeyAddr;
    address sessionKeyAddr2;

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new PatronEscrow(address(usdc));
        sessionKeyAddr = vm.addr(SESSION_PRIV_KEY);
        sessionKeyAddr2 = vm.addr(SESSION_PRIV_KEY_2);
    }

    // --- Helpers ---

    function _join() internal returns (PatronSmartAccount) {
        vm.prank(listener);
        return PatronSmartAccount(escrow.join(sessionKeyAddr));
    }

    function _fund(PatronSmartAccount smartAccount, uint256 amount) internal {
        usdc.mint(address(smartAccount), amount);
    }

    function _signTipWith(
        uint256 privKey,
        address smartAccount,
        bytes32 _mbidHash,
        uint256 amount,
        uint256 nonce
    ) internal pure returns (bytes memory) {
        bytes32 hash = keccak256(abi.encodePacked(smartAccount, _mbidHash, amount, nonce));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(hash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, ethHash);
        return abi.encodePacked(r, s, v);
    }

    function _signTip(
        address smartAccount,
        bytes32 _mbidHash,
        uint256 amount,
        uint256 nonce
    ) internal pure returns (bytes memory) {
        return _signTipWith(SESSION_PRIV_KEY, smartAccount, _mbidHash, amount, nonce);
    }

    /// Tips `amount` to `_mbidHash` from `_join()`-ed smart account funded with 10e6.
    function _tipUnclaimed(bytes32 _mbidHash, uint256 amount)
        internal
        returns (PatronSmartAccount smartAccount)
    {
        smartAccount = _join();
        _fund(smartAccount, 10e6);
        uint256 nonce = escrow.tipNonce(address(smartAccount));
        bytes memory sig = _signTip(address(smartAccount), _mbidHash, amount, nonce);
        escrow.tipWithSignature(address(smartAccount), _mbidHash, amount, nonce, sig);
    }

    // =========================================================================
    // join()
    // =========================================================================

    function testJoinDeploysSmartAccount() public {
        vm.prank(listener);
        address smartAccount = escrow.join(sessionKeyAddr);

        assertEq(escrow.smartAccounts(listener), smartAccount);
        assertEq(PatronSmartAccount(smartAccount).owner(), listener);
        assertEq(PatronSmartAccount(smartAccount).sessionKey(), sessionKeyAddr);
        assertEq(address(PatronSmartAccount(smartAccount).escrow()), address(escrow));
    }

    function testJoinEmitsEvent() public {
        address expected = vm.computeCreateAddress(address(escrow), vm.getNonce(address(escrow)));
        vm.prank(listener);
        vm.expectEmit(true, true, true, false);
        emit PatronEscrow.Joined(listener, expected, sessionKeyAddr);
        escrow.join(sessionKeyAddr);
    }

    function testJoinRotatesSessionKey() public {
        PatronSmartAccount smartAccount = _join();

        vm.prank(listener);
        escrow.join(sessionKeyAddr2);

        assertEq(PatronSmartAccount(smartAccount).sessionKey(), sessionKeyAddr2);
        assertEq(escrow.smartAccounts(listener), address(smartAccount));
    }

    function testOldSessionKeyRejectedAfterRotation() public {
        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 10e6);

        vm.prank(listener);
        escrow.join(sessionKeyAddr2);

        uint256 nonce = escrow.tipNonce(address(smartAccount));
        bytes memory oldSig = _signTip(address(smartAccount), mbidHash, 10000, nonce);
        vm.expectRevert("Invalid session key");
        escrow.tipWithSignature(address(smartAccount), mbidHash, 10000, nonce, oldSig);
    }

    function testNewSessionKeyAcceptedAfterRotation() public {
        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 10e6);

        vm.prank(listener);
        escrow.join(sessionKeyAddr2);

        uint256 nonce = escrow.tipNonce(address(smartAccount));
        bytes memory newSig =
            _signTipWith(SESSION_PRIV_KEY_2, address(smartAccount), mbidHash, 10000, nonce);
        escrow.tipWithSignature(address(smartAccount), mbidHash, 10000, nonce, newSig);

        assertEq(escrow.unclaimedBalance(mbidHash), 10000);
    }

    // =========================================================================
    // tipWithSignature()
    // =========================================================================

    function testTipWithSignatureUnclaimed() public {
        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 10e6);

        uint256 nonce = escrow.tipNonce(address(smartAccount));
        bytes memory sig = _signTip(address(smartAccount), mbidHash, 10000, nonce);

        escrow.tipWithSignature(address(smartAccount), mbidHash, 10000, nonce, sig);

        assertEq(escrow.unclaimedBalance(mbidHash), 10000);
        assertEq(usdc.balanceOf(address(smartAccount)), 10e6 - 10000);
        assertEq(usdc.balanceOf(address(escrow)), 10000);
        assertEq(escrow.tipNonce(address(smartAccount)), 1);
    }

    function testTipWithSignatureVerifiedArtist() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);
        escrow.verifyAndRelease(mbidHash);

        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 10e6);

        uint256 nonce = escrow.tipNonce(address(smartAccount));
        bytes memory sig = _signTip(address(smartAccount), mbidHash, 10000, nonce);

        escrow.tipWithSignature(address(smartAccount), mbidHash, 10000, nonce, sig);

        assertEq(usdc.balanceOf(artist), 10000);
        assertEq(usdc.balanceOf(address(smartAccount)), 10e6 - 10000);
        assertEq(escrow.unclaimedBalance(mbidHash), 0);
    }

    function testConsecutiveTips() public {
        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 10e6);

        for (uint256 i = 0; i < 3; i++) {
            uint256 nonce = escrow.tipNonce(address(smartAccount));
            assertEq(nonce, i);
            bytes memory sig = _signTip(address(smartAccount), mbidHash, 10000, nonce);
            escrow.tipWithSignature(address(smartAccount), mbidHash, 10000, nonce, sig);
        }

        assertEq(escrow.unclaimedBalance(mbidHash), 30000);
        assertEq(escrow.tipNonce(address(smartAccount)), 3);
    }

    function testTipWithSignatureReplayReverts() public {
        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 10e6);

        uint256 nonce = escrow.tipNonce(address(smartAccount));
        bytes memory sig = _signTip(address(smartAccount), mbidHash, 10000, nonce);
        escrow.tipWithSignature(address(smartAccount), mbidHash, 10000, nonce, sig);

        vm.expectRevert("Invalid nonce");
        escrow.tipWithSignature(address(smartAccount), mbidHash, 10000, nonce, sig);
    }

    function testTipWithSignatureWrongKeyReverts() public {
        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 10e6);

        uint256 nonce = escrow.tipNonce(address(smartAccount));
        bytes memory badSig = _signTipWith(0x1234, address(smartAccount), mbidHash, 10000, nonce);

        vm.expectRevert("Invalid session key");
        escrow.tipWithSignature(address(smartAccount), mbidHash, 10000, nonce, badSig);
    }

    function testTipWithSpoofedSmartAccountReverts() public {
        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 10e6);

        vm.prank(listener2);
        PatronSmartAccount smartAccount2 = PatronSmartAccount(escrow.join(sessionKeyAddr2));
        _fund(smartAccount2, 10e6);

        uint256 nonce = escrow.tipNonce(address(smartAccount2));
        // listener signs over smartAccount2's address but with session key 1 — should fail
        bytes memory spoofedSig = _signTip(address(smartAccount2), mbidHash, 10000, nonce);

        vm.expectRevert("Invalid session key");
        escrow.tipWithSignature(address(smartAccount2), mbidHash, 10000, nonce, spoofedSig);
    }

    // =========================================================================
    // PatronSmartAccount
    // =========================================================================

    function testPullNotEscrowReverts() public {
        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 5e6);

        vm.prank(address(0xBAD));
        vm.expectRevert("Only escrow");
        smartAccount.pull(5e6);
    }

    function testSmartAccountWithdraw() public {
        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 5e6);

        vm.prank(listener);
        smartAccount.withdraw(5e6);

        assertEq(usdc.balanceOf(listener), 5e6);
        assertEq(usdc.balanceOf(address(smartAccount)), 0);
    }

    function testSmartAccountWithdrawNotOwnerReverts() public {
        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 5e6);

        vm.prank(address(0xBAD));
        vm.expectRevert("Only owner");
        smartAccount.withdraw(5e6);
    }

    function testSmartAccountSetSessionDirectly() public {
        PatronSmartAccount smartAccount = _join();

        vm.prank(listener);
        smartAccount.setSession(sessionKeyAddr2);

        assertEq(smartAccount.sessionKey(), sessionKeyAddr2);
    }

    function testSmartAccountSetSessionNotOwnerReverts() public {
        PatronSmartAccount smartAccount = _join();

        vm.prank(address(0xBAD));
        vm.expectRevert("Unauthorized");
        smartAccount.setSession(address(0xBEEF));
    }

    // =========================================================================
    // claimArtist / verifyAndRelease (self-service path)
    // =========================================================================

    function testClaimArtist() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);
        assertEq(escrow.artistWallet(mbidHash), artist);
    }

    function testClaimArtistAlreadyClaimedReverts() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        vm.prank(address(0x4));
        vm.expectRevert("Already claimed");
        escrow.claimArtist(mbidHash);
    }

    function testVerifyAndRelease() public {
        _tipUnclaimed(mbidHash, 1e6);

        vm.prank(artist);
        escrow.claimArtist(mbidHash);
        escrow.verifyAndRelease(mbidHash);

        assertTrue(escrow.isVerified(mbidHash));
        assertEq(escrow.unclaimedBalance(mbidHash), 0);
        assertEq(usdc.balanceOf(artist), 1e6);
    }

    function testVerifyAndReleaseNotOwnerReverts() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        vm.prank(listener);
        vm.expectRevert();
        escrow.verifyAndRelease(mbidHash);
    }

    function testVerifyAndReleaseNotClaimedReverts() public {
        vm.expectRevert("Not claimed");
        escrow.verifyAndRelease(mbidHash);
    }

    // =========================================================================
    // registerArtist (owner fast-path)
    // =========================================================================

    function testRegisterArtist() public {
        escrow.registerArtist(mbidHash, "test-artist", artist);

        assertEq(escrow.artistWallet(mbidHash), artist);
        assertTrue(escrow.isVerified(mbidHash));
        assertEq(escrow.artistSubname(mbidHash), "test-artist");
        assertEq(escrow.subnameMbid("test-artist"), mbidHash);
    }

    function testRegisterArtistReleasesEscrowedFunds() public {
        // Tip lands in unclaimed escrow first
        _tipUnclaimed(mbidHash, 1e6);
        assertEq(escrow.unclaimedBalance(mbidHash), 1e6);

        // Owner registers artist — should release escrowed funds immediately
        escrow.registerArtist(mbidHash, "test-artist", artist);

        assertEq(escrow.unclaimedBalance(mbidHash), 0);
        assertEq(usdc.balanceOf(artist), 1e6);
    }

    function testRegisterArtistTipsRouteDirectly() public {
        escrow.registerArtist(mbidHash, "test-artist", artist);

        PatronSmartAccount smartAccount = _join();
        _fund(smartAccount, 10e6);
        uint256 nonce = escrow.tipNonce(address(smartAccount));
        bytes memory sig = _signTip(address(smartAccount), mbidHash, 10000, nonce);
        escrow.tipWithSignature(address(smartAccount), mbidHash, 10000, nonce, sig);

        assertEq(usdc.balanceOf(artist), 10000);
        assertEq(escrow.unclaimedBalance(mbidHash), 0);
    }

    function testRegisterArtistDuplicateReverts() public {
        escrow.registerArtist(mbidHash, "test-artist", artist);

        vm.expectRevert("Already registered");
        escrow.registerArtist(mbidHash, "test-artist-2", address(0x3));
    }

    function testRegisterArtistSubnameTakenReverts() public {
        escrow.registerArtist(mbidHash, "test-artist", artist);

        vm.expectRevert("Subname taken");
        escrow.registerArtist(otherMbid, "test-artist", address(0x3));
    }

    function testRegisterArtistNotOwnerReverts() public {
        vm.prank(artist);
        vm.expectRevert();
        escrow.registerArtist(mbidHash, "test-artist", artist);
    }

    function testRegisterArtistMbidStoredInTextRecord() public {
        escrow.registerArtist(mbidHash, "test-artist", artist);
        string memory stored = escrow.getTextRecord(mbidHash, "com.musicbrainz.mbid");
        assertTrue(bytes(stored).length > 0);
    }

    // =========================================================================
    // setSubname (post-claim ENS assignment)
    // =========================================================================

    function testSetSubname() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);
        escrow.verifyAndRelease(mbidHash);

        escrow.setSubname(mbidHash, "test-artist");

        assertEq(escrow.artistSubname(mbidHash), "test-artist");
        assertEq(escrow.subnameMbid("test-artist"), mbidHash);
    }

    function testSetSubnameNotRegisteredReverts() public {
        vm.expectRevert("Artist not registered");
        escrow.setSubname(mbidHash, "test-artist");
    }

    function testSetSubnameAlreadyAssignedReverts() public {
        escrow.registerArtist(mbidHash, "test-artist", artist);

        vm.expectRevert("Subname already assigned");
        escrow.setSubname(mbidHash, "test-artist-2");
    }

    function testSetSubnameTakenReverts() public {
        escrow.registerArtist(mbidHash, "test-artist", artist);

        vm.prank(address(0x4));
        escrow.claimArtist(otherMbid);  // some other artist claims
        // owner tries to assign the taken subname to the other artist
        vm.expectRevert("Subname taken");
        escrow.setSubname(otherMbid, "test-artist");
    }

    function testSetSubnameNotOwnerReverts() public {
        vm.prank(artist);
        escrow.claimArtist(mbidHash);

        vm.prank(artist);
        vm.expectRevert();
        escrow.setSubname(mbidHash, "test-artist");
    }

    // =========================================================================
    // resolveSubname / text records
    // =========================================================================

    function testResolveSubname() public {
        escrow.registerArtist(mbidHash, "test-artist", artist);
        assertEq(escrow.resolveSubname("test-artist"), artist);
    }

    function testResolveSubnameUnknownReturnsZero() public view {
        assertEq(escrow.resolveSubname("nobody"), address(0));
    }

    function testSetAndGetTextRecord() public {
        escrow.registerArtist(mbidHash, "test-artist", artist);
        escrow.setTextRecord(mbidHash, "url", "https://example.com");
        assertEq(escrow.getTextRecord(mbidHash, "url"), "https://example.com");
    }

    function testSetTextRecordNotOwnerReverts() public {
        vm.prank(artist);
        vm.expectRevert();
        escrow.setTextRecord(mbidHash, "url", "https://example.com");
    }

    // =========================================================================
    // Misc
    // =========================================================================

    function testSetDefaultTipAmount() public {
        escrow.setDefaultTipAmount(100000);
        assertEq(escrow.defaultTipAmount(), 100000);
    }

    function testGetArtistInfo() public {
        _tipUnclaimed(mbidHash, 50000);

        (address wallet, bool verified, uint256 unclaimed) = escrow.getArtistInfo(mbidHash);
        assertEq(wallet, address(0));
        assertFalse(verified);
        assertEq(unclaimed, 50000);
    }
}
