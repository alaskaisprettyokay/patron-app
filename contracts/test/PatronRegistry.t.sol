// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PatronRegistry.sol";

contract PatronRegistryTest is Test {
    PatronRegistry registry;

    address owner = address(this);
    address artist = address(0x2);

    bytes32 mbidHash = keccak256("test-mbid-1234");

    function setUp() public {
        registry = new PatronRegistry();
    }

    function testRegisterArtist() public {
        registry.registerArtist(mbidHash, "test-artist", artist);

        assertEq(registry.artistAddress(mbidHash), artist);
        assertEq(registry.artistSubname(mbidHash), "test-artist");
        assertEq(registry.subnameMbid("test-artist"), mbidHash);
    }

    function testRegisterArtistDuplicate() public {
        registry.registerArtist(mbidHash, "test-artist", artist);

        vm.expectRevert("Already registered");
        registry.registerArtist(mbidHash, "test-artist-2", address(0x3));
    }

    function testRegisterArtistSubnameTaken() public {
        registry.registerArtist(mbidHash, "test-artist", artist);

        bytes32 otherMbid = keccak256("other-mbid");
        vm.expectRevert("Subname taken");
        registry.registerArtist(otherMbid, "test-artist", address(0x3));
    }

    function testResolveArtist() public {
        registry.registerArtist(mbidHash, "test-artist", artist);
        assertEq(registry.resolveArtist(mbidHash), artist);
    }

    function testResolveSubname() public {
        registry.registerArtist(mbidHash, "test-artist", artist);
        assertEq(registry.resolveSubname("test-artist"), artist);
    }

    function testSetTextRecord() public {
        registry.registerArtist(mbidHash, "test-artist", artist);
        registry.setTextRecord(mbidHash, "url", "https://example.com");
        assertEq(registry.getTextRecord(mbidHash, "url"), "https://example.com");
    }

    function testMbidStoredInTextRecords() public {
        registry.registerArtist(mbidHash, "test-artist", artist);
        string memory stored = registry.getTextRecord(mbidHash, "com.musicbrainz.mbid");
        assertTrue(bytes(stored).length > 0);
    }

    function testRegisterNotOwner() public {
        vm.prank(artist);
        vm.expectRevert();
        registry.registerArtist(mbidHash, "test-artist", artist);
    }
}
