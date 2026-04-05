// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Wire the Arc L2Registry to onda.eth on Sepolia.
//
// This does two things on Sepolia:
//   1. Sets onda.eth's resolver to the Durin L1Resolver (if not already set).
//   2. Calls setL2Registry() on the L1Resolver, pointing it at the Arc L2Registry.
//
// Usage:
//   forge script script/SetL2Resolver.s.sol \
//     --rpc-url sepolia \
//     --broadcast \
//     -vvv
//
// Required env vars:
//   SEPOLIA_OWNER_KEY  — private key of the onda.eth owner on Sepolia
//   REGISTRY_ADDRESS   — address of the L2Registry deployed on Arc (from DeployL2Registry.s.sol)
//
// NOTE: If onda.eth is a wrapped name (uses the ENS NameWrapper), setting the resolver via
// the ENS registry directly may revert. In that case, set the resolver through the ENS app
// (app.ens.domains → onda.eth → Edit → Resolver → 0x8A968aB9eb8C084FBC44c531058Fc9ef945c3D61)
// and then re-run this script with SKIP_SET_RESOLVER=true.

import "forge-std/Script.sol";

interface IENS {
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
    function setResolver(bytes32 node, address resolver) external;
}

interface IL1Resolver {
    function setL2Registry(bytes32 node, uint64 chainId, address registryAddress) external;
}

contract SetL2Resolver is Script {
    // Sepolia ENS registry (same address as mainnet)
    IENS constant ENS = IENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);

    // Durin L1Resolver on Sepolia — the shared resolver you point your ENS name at
    address constant L1_RESOLVER = 0x8A968aB9eb8C084FBC44c531058Fc9ef945c3D61;

    // Arc Testnet chain ID
    uint64 constant ARC_CHAIN_ID = 5042002;

    function run() external {
        uint256 ownerKey = vm.envUint("SEPOLIA_OWNER_KEY");
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        bool skipSetResolver = vm.envOr("SKIP_SET_RESOLVER", false);

        // Compute namehash("onda.eth") inline — no import needed.
        // namehash("eth")      = keccak256(bytes32(0) ++ keccak256("eth"))
        // namehash("onda.eth") = keccak256(namehash("eth") ++ keccak256("onda"))
        bytes32 ethNode = keccak256(abi.encodePacked(bytes32(0), keccak256(bytes("eth"))));
        bytes32 ondaNode = keccak256(abi.encodePacked(ethNode, keccak256(bytes("onda"))));

        console.log("onda.eth node:");
        console.logBytes32(ondaNode);
        console.log("Current ENS owner :", ENS.owner(ondaNode));
        console.log("Current resolver  :", ENS.resolver(ondaNode));

        vm.startBroadcast(ownerKey);

        // Step 1: point onda.eth's resolver at the Durin L1Resolver.
        if (!skipSetResolver && ENS.resolver(ondaNode) != L1_RESOLVER) {
            ENS.setResolver(ondaNode, L1_RESOLVER);
            console.log("Resolver updated to L1Resolver.");
        } else {
            console.log("Resolver already set (or skipped).");
        }

        // Step 2: register the Arc L2Registry with the L1Resolver.
        IL1Resolver(L1_RESOLVER).setL2Registry(ondaNode, ARC_CHAIN_ID, registryAddress);

        vm.stopBroadcast();

        console.log("");
        console.log("=== onda.eth subnames now resolve via Arc ===");
        console.log("L1Resolver :", L1_RESOLVER);
        console.log("L2Registry :", registryAddress);
        console.log("Chain ID   :", ARC_CHAIN_ID);
        console.log("");
        console.log("Subnames like artist.onda.eth will resolve once you");
        console.log("call L2Registry.createSubnode() (or L2Registrar.register())");
        console.log("on Arc and the Durin gateway is queried.");
    }
}
