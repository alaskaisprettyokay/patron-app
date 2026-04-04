// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./PatronSmartAccount.sol";
import "./interfaces/IPatronSmartAccount.sol";

contract PatronEscrow is Ownable {
    using ECDSA for bytes32;

    IERC20 public usdc;

    // --- Listener accounts ---

    /// @notice owner wallet → smart account address (set on first join, never changes)
    mapping(address => address) public smartAccounts;

    /// @notice Replay protection: smartAccount → next expected nonce
    mapping(address => uint256) public tipNonce;

    // --- Artist registry ---

    mapping(bytes32 => address) public artistWallet;
    mapping(bytes32 => bool) public isVerified;
    mapping(bytes32 => uint256) public unclaimedBalance;

    // ENS subname registry (merged from PatronRegistry)
    mapping(bytes32 => string) public artistSubname;
    mapping(string => bytes32) public subnameMbid;
    mapping(bytes32 => mapping(string => string)) public textRecords;

    uint256 public defaultTipAmount = 10000; // 0.01 USDC (6 decimals)

    // --- Events ---

    event Joined(
        address indexed user,
        address indexed smartAccount,
        address indexed sessionKey
    );
    event Tipped(
        address indexed smartAccount,
        bytes32 indexed mbidHash,
        uint256 amount,
        uint256 nonce
    );
    event ArtistClaimed(bytes32 indexed mbidHash, address indexed wallet);
    event ArtistVerified(bytes32 indexed mbidHash, address indexed wallet);
    /// @notice Emitted when the owner directly registers a verified artist with a subname.
    event ArtistRegistered(bytes32 indexed mbidHash, string subname, address indexed wallet);
    event TextRecordSet(bytes32 indexed mbidHash, string key, string value);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // --- Account management ---

    /// @notice Links the caller's wallet to the extension's session key.
    ///         On first call: deploys a PatronSmartAccount for the caller.
    ///         On subsequent calls (e.g. after reinstalling the extension): rotates the session key.
    function join(address sessionKey) external returns (address smartAccount) {
        if (smartAccounts[msg.sender] == address(0)) {
            smartAccount = address(
                new PatronSmartAccount(msg.sender, sessionKey)
            );
            smartAccounts[msg.sender] = smartAccount;
        } else {
            smartAccount = smartAccounts[msg.sender];
            IPatronSmartAccount(smartAccount).setSession(sessionKey);
        }
        emit Joined(msg.sender, smartAccount, sessionKey);
    }

    // --- Tip processing ---

    /// @notice Processes a tip authorised by a session key signature.
    /// @param smartAccount The listener's smart account (included in the signed payload).
    /// @param mbidHash     keccak256 of the artist's MusicBrainz ID.
    /// @param amount       USDC amount in 6-decimal units.
    /// @param nonce        Must equal tipNonce[smartAccount] to prevent replay.
    /// @param signature    EIP-191 personal_sign of keccak256(smartAccount ‖ mbidHash ‖ amount ‖ nonce).
    function tipWithSignature(
        address smartAccount,
        bytes32 mbidHash,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external {
        require(nonce == tipNonce[smartAccount], "Invalid nonce");
        tipNonce[smartAccount]++;

        bytes32 hash = keccak256(abi.encodePacked(smartAccount, mbidHash, amount, nonce));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(hash);
        address signer = ECDSA.recover(ethHash, signature);
        require(signer == IPatronSmartAccount(smartAccount).sessionKey(), "Invalid session key");

        IPatronSmartAccount(smartAccount).pull(amount);

        address wallet = artistWallet[mbidHash];
        if (wallet != address(0) && isVerified[mbidHash]) {
            usdc.transfer(wallet, amount);
        } else {
            unclaimedBalance[mbidHash] += amount;
        }

        emit Tipped(smartAccount, mbidHash, amount, nonce);
    }

    // --- Artist self-service claim ---

    function claimArtist(bytes32 mbidHash) external {
        require(artistWallet[mbidHash] == address(0), "Already claimed");
        artistWallet[mbidHash] = msg.sender;
        emit ArtistClaimed(mbidHash, msg.sender);
    }

    /// @notice Called by owner after off-chain verification. Releases escrowed tips to artist.
    function verifyAndRelease(bytes32 mbidHash) external onlyOwner {
        require(artistWallet[mbidHash] != address(0), "Not claimed");
        isVerified[mbidHash] = true;

        uint256 balance = unclaimedBalance[mbidHash];
        if (balance > 0) {
            unclaimedBalance[mbidHash] = 0;
            usdc.transfer(artistWallet[mbidHash], balance);
        }

        emit ArtistVerified(mbidHash, artistWallet[mbidHash]);
    }

    // --- ENS subname registry ---

    /// @notice Owner fast-path: register, verify, and assign an ENS subname in one call.
    ///         Use this instead of the claimArtist → verifyAndRelease two-step when the
    ///         owner is proactively onboarding a known artist.
    function registerArtist(
        bytes32 mbidHash,
        string calldata subname,
        address wallet
    ) external onlyOwner {
        require(bytes(artistSubname[mbidHash]).length == 0, "Already registered");
        require(subnameMbid[subname] == bytes32(0), "Subname taken");

        artistWallet[mbidHash] = wallet;
        isVerified[mbidHash] = true;
        artistSubname[mbidHash] = subname;
        subnameMbid[subname] = mbidHash;
        textRecords[mbidHash]["com.musicbrainz.mbid"] = _bytes32ToHexString(mbidHash);

        // Release any funds already escrowed under this mbid
        uint256 balance = unclaimedBalance[mbidHash];
        if (balance > 0) {
            unclaimedBalance[mbidHash] = 0;
            usdc.transfer(wallet, balance);
        }

        emit ArtistRegistered(mbidHash, subname, wallet);
    }

    /// @notice Assigns an ENS subname to an artist who already went through the
    ///         self-service claimArtist → verifyAndRelease path.
    function setSubname(bytes32 mbidHash, string calldata subname) external onlyOwner {
        require(artistWallet[mbidHash] != address(0), "Artist not registered");
        require(bytes(artistSubname[mbidHash]).length == 0, "Subname already assigned");
        require(subnameMbid[subname] == bytes32(0), "Subname taken");

        artistSubname[mbidHash] = subname;
        subnameMbid[subname] = mbidHash;
    }

    /// @notice Resolves an ENS subname to the artist's wallet address.
    function resolveSubname(string calldata subname) external view returns (address) {
        return artistWallet[subnameMbid[subname]];
    }

    function setTextRecord(
        bytes32 mbidHash,
        string calldata key,
        string calldata value
    ) external onlyOwner {
        textRecords[mbidHash][key] = value;
        emit TextRecordSet(mbidHash, key, value);
    }

    function getTextRecord(bytes32 mbidHash, string calldata key)
        external
        view
        returns (string memory)
    {
        return textRecords[mbidHash][key];
    }

    // --- Misc ---

    function setDefaultTipAmount(uint256 amount) external onlyOwner {
        defaultTipAmount = amount;
    }

    function getArtistInfo(bytes32 mbidHash)
        external
        view
        returns (address wallet, bool verified, uint256 unclaimed)
    {
        return (artistWallet[mbidHash], isVerified[mbidHash], unclaimedBalance[mbidHash]);
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
