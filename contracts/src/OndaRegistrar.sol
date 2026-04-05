// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IL2Registry} from "../lib/durin/src/interfaces/IL2Registry.sol";

/// @title OndaRegistrar
/// @notice Mints artist.onda.eth subnames on behalf of the PatronEscrow.
///         Only the escrow can call register() — it does so during verifyAndRelease().
contract OndaRegistrar {
    IL2Registry public immutable registry;
    address public immutable escrow;

    // ENSIP-11 coin type for Arc Testnet (0x80000000 | chainId)
    uint256 public immutable coinType;

    event SubnameMinted(string label, address indexed owner);

    error OnlyEscrow();
    error LabelTooShort();

    constructor(address _registry, address _escrow) {
        registry = IL2Registry(_registry);
        escrow = _escrow;

        uint256 chainId;
        assembly { chainId := chainid() }
        coinType = 0x80000000 | chainId;
    }

    /// @notice Mints label.onda.eth and assigns it to owner.
    ///         Only callable by the PatronEscrow.
    function register(string calldata label, address owner) external {
        if (msg.sender != escrow) revert OnlyEscrow();
        if (bytes(label).length < 1) revert LabelTooShort();

        bytes32 subnode = registry.createSubnode(
            registry.baseNode(), label, owner, new bytes[](0)
        );

        // ETH address record (coinType 60)
        registry.setAddr(subnode, owner);

        // Chain-native address record (ENSIP-11)
        registry.setAddr(subnode, coinType, abi.encodePacked(owner));

        emit SubnameMinted(label, owner);
    }

    /// @notice Returns true if the label is available in the registry.
    function available(string calldata label) external view returns (bool) {
        bytes32 subnode = registry.makeNode(registry.baseNode(), label);
        try registry.ownerOf(uint256(subnode)) {
            return false;
        } catch {
            return true;
        }
    }
}
