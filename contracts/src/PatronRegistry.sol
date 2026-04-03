// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PatronRegistry is Ownable {
    // MBID hash => ENS subname (e.g., "aphex-twin")
    mapping(bytes32 => string) public artistSubname;

    // Subname => MBID hash (reverse lookup)
    mapping(string => bytes32) public subnameMbid;

    // MBID hash => wallet address
    mapping(bytes32 => address) public artistAddress;

    // MBID hash => text records
    mapping(bytes32 => mapping(string => string)) public textRecords;

    event ArtistRegistered(bytes32 indexed mbidHash, string subname, address indexed wallet);
    event TextRecordSet(bytes32 indexed mbidHash, string key, string value);

    constructor() Ownable(msg.sender) {}

    function registerArtist(bytes32 mbidHash, string calldata subname, address wallet) external onlyOwner {
        require(bytes(artistSubname[mbidHash]).length == 0, "Already registered");
        require(subnameMbid[subname] == bytes32(0), "Subname taken");

        artistSubname[mbidHash] = subname;
        subnameMbid[subname] = mbidHash;
        artistAddress[mbidHash] = wallet;

        // Store MBID in text records
        textRecords[mbidHash]["com.musicbrainz.mbid"] = _bytes32ToHexString(mbidHash);

        emit ArtistRegistered(mbidHash, subname, wallet);
    }

    function resolveArtist(bytes32 mbidHash) external view returns (address) {
        return artistAddress[mbidHash];
    }

    function resolveSubname(string calldata subname) external view returns (address) {
        bytes32 mbidHash = subnameMbid[subname];
        return artistAddress[mbidHash];
    }

    function setTextRecord(bytes32 mbidHash, string calldata key, string calldata value) external onlyOwner {
        textRecords[mbidHash][key] = value;
        emit TextRecordSet(mbidHash, key, value);
    }

    function getTextRecord(bytes32 mbidHash, string calldata key) external view returns (string memory) {
        return textRecords[mbidHash][key];
    }

    function _bytes32ToHexString(bytes32 data) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(66);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}
