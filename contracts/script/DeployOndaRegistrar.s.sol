// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Deploy OndaRegistrar and authorize it on an existing L2Registry.
//
// Usage:
//   forge script script/DeployOndaRegistrar.s.sol \
//     --rpc-url arc_testnet \
//     --broadcast \
//     -vvv
//
// Required env vars:
//   DEPLOYER_KEY           — private key of the deployer (must be the L2Registry admin)
//   PATRON_ESCROW_ADDRESS  — PatronEscrow address on Arc
//   L2_REGISTRY_ADDRESS    — L2Registry address already deployed on Arc

import "forge-std/Script.sol";
import {L2Registry} from "../lib/durin/src/L2Registry.sol";
import {OndaRegistrar} from "../src/OndaRegistrar.sol";

contract DeployOndaRegistrar is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address escrowAddress = vm.envAddress("PATRON_ESCROW_ADDRESS");
        address registryAddress = vm.envAddress("L2_REGISTRY_ADDRESS");

        vm.startBroadcast(deployerKey);

        OndaRegistrar registrar = new OndaRegistrar(registryAddress, escrowAddress);
        L2Registry(registryAddress).addRegistrar(address(registrar));

        vm.stopBroadcast();

        console.log("OndaRegistrar:", address(registrar));
        console.log("Authorized on L2Registry:", registryAddress);
    }
}
