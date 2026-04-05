// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Revoke a retired OndaRegistrar from the L2Registry so it can no longer mint subnames.
//
// Usage:
//   forge script script/DecommissionRegistrar.s.sol \
//     --rpc-url arc_testnet \
//     --broadcast \
//     -vvv
//
// Required env vars:
//   DEPLOYER_KEY              — private key of the L2Registry owner
//   L2_REGISTRY_ADDRESS       — L2Registry address on Arc
//   OLD_REGISTRAR_ADDRESS     — OndaRegistrar to decommission

import "forge-std/Script.sol";
import {L2Registry} from "../lib/durin/src/L2Registry.sol";

contract DecommissionRegistrar is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address registryAddress = vm.envAddress("L2_REGISTRY_ADDRESS");
        address oldRegistrar = vm.envAddress("OLD_REGISTRAR_ADDRESS");

        vm.startBroadcast(deployerKey);
        L2Registry(registryAddress).removeRegistrar(oldRegistrar);
        vm.stopBroadcast();

        console.log("Decommissioned registrar:", oldRegistrar);
        console.log("Removed from registry:  ", registryAddress);
    }
}
