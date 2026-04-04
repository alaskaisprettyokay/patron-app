// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PatronEscrow.sol";
import "../src/PatronRegistry.sol";

contract DeployArc is Script {
    // Arc testnet native USDC ERC-20 precompile (6 decimals)
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy PatronEscrow pointing at real USDC
        PatronEscrow escrow = new PatronEscrow(ARC_USDC);
        console.log("PatronEscrow deployed at:", address(escrow));

        // Deploy PatronRegistry
        PatronRegistry registry = new PatronRegistry();
        console.log("PatronRegistry deployed at:", address(registry));

        vm.stopBroadcast();

        console.log("---");
        console.log("Deployer:", deployer);
        console.log("Set these in .env.local:");
        console.log("NEXT_PUBLIC_USDC_ADDRESS=", ARC_USDC);
        console.log("NEXT_PUBLIC_PATRON_ESCROW_ADDRESS=", address(escrow));
        console.log("NEXT_PUBLIC_PATRON_REGISTRY_ADDRESS=", address(registry));
    }
}
