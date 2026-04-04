// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PatronAccount.sol";
import "../src/PatronEscrow.sol";
import "../src/MockUSDC.sol";

contract PatronAccountTest is Test {
    PatronAccount account;
    PatronAccountFactory factory;
    PatronEscrow escrow;
    MockUSDC usdc;

    address owner = address(this);           // Listener's main wallet
    uint256 sessionPrivKey = 0xBEEF;
    address sessionKey = vm.addr(sessionPrivKey); // Extension-generated key
    address artist = address(0x2);

    bytes32 mbidHash = keccak256("test-mbid-1234");
    bytes4 tipSelector = bytes4(keccak256("tipDefault(bytes32)"));

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new PatronEscrow(address(usdc));
        factory = new PatronAccountFactory();

        // Deploy account via factory
        account = factory.createAccount(owner);

        // Fund the account with USDC
        usdc.mint(address(account), 100e6);

        // Owner deposits into escrow through the account
        account.depositToEscrow(address(escrow), address(usdc), 50e6);

        // Authorize session key: can only call tipDefault on escrow,
        // 2 USDC/day limit, expires in 30 days
        // Fund the account with native USDC for gas stipends
        vm.deal(address(account), 1e6); // $1 USDC native for gas

        account.authorizeSession(
            sessionKey,
            address(escrow),
            tipSelector,
            2_000_000,  // 2 USDC per period
            86400,      // 1 day
            block.timestamp + 30 days,
            100000      // $0.10 gas stipend to session key
        );
    }

    // =========================================
    // Factory tests
    // =========================================

    function testFactoryDeploy() public {
        address predicted = factory.getAddress(address(0xDEAD));
        PatronAccount deployed = factory.createAccount(address(0xDEAD));
        assertEq(predicted, address(deployed));
    }

    function testFactoryOwnerSet() public view {
        assertEq(account.owner(), owner);
    }

    // =========================================
    // Session authorization
    // =========================================

    function testAuthorizeSession() public view {
        (
            address target,
            bytes4 selector,
            uint256 spendLimit,
            ,
            uint256 periodDuration,
            ,
            uint256 validUntil,
            bool active
        ) = account.sessionKeys(sessionKey);

        assertEq(target, address(escrow));
        assertEq(selector, tipSelector);
        assertEq(spendLimit, 2_000_000);
        assertEq(periodDuration, 86400);
        assertEq(validUntil, block.timestamp + 30 days);
        assertTrue(active);
    }

    function testAuthorizeSessionFundsGas() public view {
        // Session key should have received the gas stipend
        assertEq(sessionKey.balance, 100000);
    }

    function testAuthorizeSessionNotOwner() public {
        vm.prank(address(0xBAD));
        vm.expectRevert("Not owner");
        account.authorizeSession(
            address(0x999), address(escrow), tipSelector,
            2_000_000, 86400, block.timestamp + 30 days, 0
        );
    }

    function testAuthorizeSessionZeroKey() public {
        vm.expectRevert("Invalid key");
        account.authorizeSession(
            address(0), address(escrow), tipSelector,
            2_000_000, 86400, block.timestamp + 30 days, 0
        );
    }

    function testAuthorizeSessionAlreadyExpired() public {
        vm.expectRevert("Already expired");
        account.authorizeSession(
            address(0x999), address(escrow), tipSelector,
            2_000_000, 86400, block.timestamp - 1, 0
        );
    }

    function testFundSessionKey() public {
        uint256 balBefore = sessionKey.balance;
        vm.deal(address(account), 200000);
        account.fundSessionKey(sessionKey, 200000);
        assertEq(sessionKey.balance, balBefore + 200000);
    }

    function testFundSessionKeyNotActive() public {
        account.revokeSession(sessionKey);
        vm.deal(address(account), 100000);
        vm.expectRevert("Session not active");
        account.fundSessionKey(sessionKey, 100000);
    }

    // =========================================
    // Session execution (tipping)
    // =========================================

    function testSessionTip() public {
        bytes memory callData = abi.encodeWithSelector(tipSelector, mbidHash);

        vm.prank(sessionKey);
        account.executeSession(address(escrow), callData);

        // Tip should have gone through: escrow balance decreased by defaultTipAmount (10000)
        assertEq(escrow.listenerBalance(address(account)), 50e6 - 10000);
        assertEq(escrow.unclaimedBalance(mbidHash), 10000);
    }

    function testSessionMultipleTips() public {
        bytes memory callData = abi.encodeWithSelector(tipSelector, mbidHash);

        // Tip 10 times ($0.10 total, well under $2 limit)
        for (uint256 i = 0; i < 10; i++) {
            vm.prank(sessionKey);
            account.executeSession(address(escrow), callData);
        }

        assertEq(escrow.listenerBalance(address(account)), 50e6 - 100000);
        assertEq(escrow.unclaimedBalance(mbidHash), 100000);
    }

    // =========================================
    // Spend limit enforcement
    // =========================================

    function testSpendLimitExceeded() public {
        bytes memory callData = abi.encodeWithSelector(tipSelector, mbidHash);

        // Tip 200 times = $2.00 = exactly at limit
        for (uint256 i = 0; i < 200; i++) {
            vm.prank(sessionKey);
            account.executeSession(address(escrow), callData);
        }

        // 201st tip should fail
        vm.prank(sessionKey);
        vm.expectRevert("Spend limit exceeded");
        account.executeSession(address(escrow), callData);
    }

    function testSpendLimitResetsAfterPeriod() public {
        bytes memory callData = abi.encodeWithSelector(tipSelector, mbidHash);

        // Use up the limit
        for (uint256 i = 0; i < 200; i++) {
            vm.prank(sessionKey);
            account.executeSession(address(escrow), callData);
        }

        // Advance time by 1 day
        vm.warp(block.timestamp + 86400);

        // Should work again
        vm.prank(sessionKey);
        account.executeSession(address(escrow), callData);

        assertEq(escrow.unclaimedBalance(mbidHash), 201 * 10000);
    }

    // =========================================
    // Session constraints
    // =========================================

    function testSessionExpired() public {
        bytes memory callData = abi.encodeWithSelector(tipSelector, mbidHash);

        vm.warp(block.timestamp + 31 days);

        vm.prank(sessionKey);
        vm.expectRevert("Session expired");
        account.executeSession(address(escrow), callData);
    }

    function testSessionRevoked() public {
        account.revokeSession(sessionKey);

        bytes memory callData = abi.encodeWithSelector(tipSelector, mbidHash);

        vm.prank(sessionKey);
        vm.expectRevert("Session not active");
        account.executeSession(address(escrow), callData);
    }

    function testSessionWrongTarget() public {
        // Try to call a different contract
        bytes memory callData = abi.encodeWithSelector(tipSelector, mbidHash);

        vm.prank(sessionKey);
        vm.expectRevert("Target not allowed");
        account.executeSession(address(usdc), callData);
    }

    function testSessionWrongSelector() public {
        // Try to call withdraw instead of tipDefault
        bytes memory callData = abi.encodeWithSelector(
            bytes4(keccak256("withdraw(uint256)")), 1e6
        );

        vm.prank(sessionKey);
        vm.expectRevert("Function not allowed");
        account.executeSession(address(escrow), callData);
    }

    function testSessionUnauthorizedCaller() public {
        bytes memory callData = abi.encodeWithSelector(tipSelector, mbidHash);

        vm.prank(address(0xBAD));
        vm.expectRevert("Session not active");
        account.executeSession(address(escrow), callData);
    }

    // =========================================
    // Owner functions
    // =========================================

    function testDepositToEscrow() public view {
        // setUp already deposited 50 USDC
        assertEq(escrow.listenerBalance(address(account)), 50e6);
    }

    function testWithdrawFromEscrow() public {
        account.withdrawFromEscrow(address(escrow), 20e6);
        assertEq(escrow.listenerBalance(address(account)), 30e6);
    }

    function testRescueToken() public {
        // There's 50 USDC left in the account (100 minted - 50 deposited)
        account.rescueToken(address(usdc), owner, 10e6);
        assertEq(usdc.balanceOf(owner), 10e6);
    }

    function testOwnerFunctionsNotCallableBySession() public {
        vm.prank(sessionKey);
        vm.expectRevert("Not owner");
        account.depositToEscrow(address(escrow), address(usdc), 1e6);

        vm.prank(sessionKey);
        vm.expectRevert("Not owner");
        account.withdrawFromEscrow(address(escrow), 1e6);

        vm.prank(sessionKey);
        vm.expectRevert("Not owner");
        account.revokeSession(sessionKey);
    }

    // =========================================
    // Integration: full tip flow with verified artist
    // =========================================

    function testFullFlowVerifiedArtist() public {
        // Artist claims and gets verified
        vm.prank(artist);
        escrow.claimArtist(mbidHash);
        escrow.verifyAndRelease(mbidHash); // owner of escrow = this test contract

        // Session key tips
        bytes memory callData = abi.encodeWithSelector(tipSelector, mbidHash);
        vm.prank(sessionKey);
        account.executeSession(address(escrow), callData);

        // Tip should go directly to artist
        assertEq(usdc.balanceOf(artist), 10000);
        assertEq(escrow.unclaimedBalance(mbidHash), 0);
    }
}
