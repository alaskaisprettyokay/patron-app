// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IL2Registry} from "../lib/durin/src/interfaces/IL2Registry.sol";

interface IPatronEscrow {
    function unclaimedBalance(bytes32 mbidHash) external view returns (uint256);
}

/// @title OndaRegistrar
/// @notice Permissionlessly registers artist.onda.eth subnames.
///         A subname can only be claimed if the artist has unclaimed tips in PatronEscrow,
///         proven by supplying their MusicBrainz ID (whose keccak256 hash is the escrow key).
///         Each MBID can only claim one subname (prevents duplicate registrations).
contract OndaRegistrar {
    IL2Registry public immutable registry;
    IPatronEscrow public immutable escrow;

    // ENSIP-11 coin type for Arc Testnet (0x80000000 | chainId)
    uint256 public immutable coinType;

    // Prevent the same artist from registering multiple subnames
    mapping(bytes32 mbidHash => bool) public claimed;

    event SubnameClaimed(
        string label,
        string mbid,
        bytes32 indexed mbidHash,
        address indexed owner
    );

    error NoUnclaimedTips(bytes32 mbidHash);
    error AlreadyClaimed(bytes32 mbidHash);
    error LabelTooShort();

    constructor(address _registry, address _escrow) {
        registry = IL2Registry(_registry);
        escrow = IPatronEscrow(_escrow);

        uint256 chainId;
        assembly { chainId := chainid() }
        coinType = 0x80000000 | chainId;
    }

    /// @notice Claim label.onda.eth for the artist identified by their MusicBrainz ID.
    /// @param label   The desired subname label, e.g. "radiohead" for "radiohead.onda.eth".
    /// @param mbid    The artist's MusicBrainz UUID, e.g. "a74b1b7f-71a5-4011-9441-d0b5e4122711".
    ///                keccak256(mbid) must map to a non-zero unclaimedBalance in PatronEscrow.
    function register(string calldata label, string calldata mbid) external {
        if (bytes(label).length < 1) revert LabelTooShort();

        bytes32 mbidHash = keccak256(bytes(mbid));

        if (claimed[mbidHash]) revert AlreadyClaimed(mbidHash);
        if (escrow.unclaimedBalance(mbidHash) == 0) revert NoUnclaimedTips(mbidHash);

        claimed[mbidHash] = true;

        // Mint the subname NFT to the caller (the artist).
        bytes32 subnode = registry.createSubnode(
            registry.baseNode(),
            label,
            msg.sender,
            new bytes[](0)
        );

        // Set the ETH address record (coinType 60) for broad wallet compatibility.
        registry.setAddr(subnode, msg.sender);

        // Set the chain-native address record for Arc (ENSIP-11).
        registry.setAddr(subnode, coinType, abi.encodePacked(msg.sender));

        // Store the raw MBID string so resolvers / indexers can look up the artist.
        registry.setText(subnode, "com.musicbrainz.mbid", mbid);

        emit SubnameClaimed(label, mbid, mbidHash, msg.sender);
    }

    /// @notice Returns true if both the label is unclaimed in the registry
    ///         and the MBID has not already been used for a different label.
    function available(string calldata label, string calldata mbid) external view returns (bool) {
        bytes32 mbidHash = keccak256(bytes(mbid));
        if (claimed[mbidHash]) return false;

        bytes32 subnode = registry.makeNode(registry.baseNode(), label);
        try registry.ownerOf(uint256(subnode)) {
            return false; // label already taken
        } catch {
            return true;
        }
    }
}
