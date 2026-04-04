// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PatronEscrow.sol";
import "../src/MockUSDC.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockUSDC (for testnet)
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // Deploy PatronEscrow
        PatronEscrow escrow = new PatronEscrow(address(usdc));
        console.log("PatronEscrow deployed at:", address(escrow));

        // Mint initial USDC to deployer for testing
        usdc.mint(deployer, 10000e6); // 10,000 USDC
        console.log("Minted 10,000 USDC to deployer");

        vm.stopBroadcast();

        console.log("---");
        console.log("Deployer:", deployer);
        console.log("Set these in .env.local:");
        console.log("NEXT_PUBLIC_USDC_ADDRESS=", address(usdc));
        console.log("NEXT_PUBLIC_PATRON_ESCROW_ADDRESS=", address(escrow));
    }
}
