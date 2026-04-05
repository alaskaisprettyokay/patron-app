// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Deploy OndaRegistrar, authorize it on the L2Registry, and wire it into the escrow.
//
// Usage:
//   forge script script/DeployOndaRegistrar.s.sol \
//     --rpc-url arc_testnet --broadcast -vvv
//
// Required env vars:
//   REGISTRY_OWNER_KEY     — key that owns the L2Registry (can call addRegistrar)
//   RELAYER_KEY            — key that owns PatronEscrow (can call setOndaRegistrar)
//   PATRON_ESCROW_ADDRESS  — PatronEscrow address on Arc
//   L2_REGISTRY_ADDRESS    — L2Registry address already deployed on Arc

import "forge-std/Script.sol";
import {L2Registry} from "../lib/durin/src/L2Registry.sol";
import {OndaRegistrar} from "../src/OndaRegistrar.sol";
import {PatronEscrow} from "../src/PatronEscrow.sol";

contract DeployOndaRegistrar is Script {
    function run() external {
        uint256 registryOwnerKey = vm.envUint("REGISTRY_OWNER_KEY");
        uint256 relayerKey = vm.envUint("RELAYER_KEY");
        address escrowAddress = vm.envAddress("PATRON_ESCROW_ADDRESS");
        address registryAddress = vm.envAddress("L2_REGISTRY_ADDRESS");

        // 1. Deploy registrar + authorize on registry (registry owner key)
        vm.startBroadcast(registryOwnerKey);
        OndaRegistrar registrar = new OndaRegistrar(registryAddress, escrowAddress);
        L2Registry(registryAddress).addRegistrar(address(registrar));
        vm.stopBroadcast();

        // 2. Wire registrar into escrow (relayer/escrow owner key)
        vm.startBroadcast(relayerKey);
        PatronEscrow(escrowAddress).setOndaRegistrar(address(registrar));
        vm.stopBroadcast();

        console.log("OndaRegistrar:          ", address(registrar));
        console.log("Authorized on registry: ", registryAddress);
        console.log("Wired into escrow:      ", escrowAddress);
        console.log("---");
        console.log("Update .env in web + extension with new PATRON_ESCROW_ADDRESS.");
    }
}
