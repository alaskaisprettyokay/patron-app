// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Deploy onda.eth L2Registry + OndaRegistrar on Arc Testnet.
//
// Usage:
//   forge script script/DeployL2Registry.s.sol \
//     --rpc-url arc_testnet \
//     --broadcast \
//     -vvv
//
// Required env vars:
//   DEPLOYER_KEY           — private key of the deployer
//   PATRON_ESCROW_ADDRESS  — PatronEscrow address already deployed on Arc
//
// After this runs, take the printed REGISTRY_ADDRESS and run SetL2Resolver.s.sol on Sepolia.

import "forge-std/Script.sol";
import {L2Registry} from "../lib/durin/src/L2Registry.sol";
import {L2RegistryFactory} from "../lib/durin/src/L2RegistryFactory.sol";
import {OndaRegistrar} from "../src/OndaRegistrar.sol";

contract DeployL2Registry is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address escrowAddress = vm.envAddress("PATRON_ESCROW_ADDRESS");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy L2Registry implementation.
        //    The constructor calls _disableInitializers() so it cannot be used directly.
        //    The factory clones it and calls initialize() on the clone.
        L2Registry impl = new L2Registry();

        // 2. Deploy factory pointing at the implementation.
        L2RegistryFactory factory = new L2RegistryFactory(address(impl));

        // 3. Create the onda.eth registry clone via the factory.
        address registry = factory.deployRegistry("onda.eth", "ONDA", "", deployer);

        // 4. Deploy OndaRegistrar — gates subname minting on pending escrow tips.
        OndaRegistrar registrar = new OndaRegistrar(registry, escrowAddress);

        // 5. Authorize the registrar on the registry.
        L2Registry(registry).addRegistrar(address(registrar));

        vm.stopBroadcast();

        console.log("=== Deployed on Arc Testnet ===");
        console.log("L2Registry implementation :", address(impl));
        console.log("L2RegistryFactory         :", address(factory));
        console.log("L2Registry (onda.eth)     :", registry);
        console.log("OndaRegistrar             :", address(registrar));
        console.log("");
        console.log("=== Next: configure Sepolia ===");
        console.log("Run SetL2Resolver.s.sol with:");
        console.log("  REGISTRY_ADDRESS=%s", registry);
        console.log("  SEPOLIA_RPC_URL=<your sepolia rpc>");
        console.log("  SEPOLIA_OWNER_KEY=<onda.eth owner key>");
    }
}
