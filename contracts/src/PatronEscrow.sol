// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./PatronSmartAccount.sol";
import "./interfaces/IPatronSmartAccount.sol";

interface IOndaRegistrar {
    function register(string calldata label, address owner) external;
}

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

    uint256 public defaultTipAmount = 10000; // 0.01 USDC (6 decimals)

    /// @notice ENS registrar — mints label.onda.eth on verifyAndRelease. Optional.
    IOndaRegistrar public ondaRegistrar;

    // --- Events ---

    event Joined(address indexed user, address indexed smartAccount, address indexed sessionKey);
    event Tipped(
        address indexed smartAccount, bytes32 indexed mbidHash, uint256 amount, uint256 nonce
    );
    event ArtistClaimed(bytes32 indexed mbidHash, address indexed wallet);
    event ArtistVerified(bytes32 indexed mbidHash, address indexed wallet);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // --- Account management ---

    /// @notice Links the caller's wallet to the extension's session key.
    ///         On first call: deploys a PatronSmartAccount for the caller.
    ///         On subsequent calls (e.g. after reinstalling the extension): rotates the session key.
    function join(address sessionKey) external returns (address smartAccount) {
        if (smartAccounts[msg.sender] == address(0)) {
            smartAccount = address(new PatronSmartAccount(msg.sender, sessionKey));
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
        // Known issue: this can be frontrun by non-artist and Deny service. Should add a signature. We're running out of time tho.
        require(artistWallet[mbidHash] == address(0), "Already claimed");
        artistWallet[mbidHash] = msg.sender;
        emit ArtistClaimed(mbidHash, msg.sender);
    }

    /// @notice Called by owner after off-chain verification.
    ///         Releases escrowed tips and mints the artist's onda.eth subname.
    /// @param mbidHash keccak256 of the artist's MusicBrainz ID.
    /// @param label    ENS label to mint, e.g. "radiohead" for "radiohead.onda.eth".
    function verifyAndRelease(bytes32 mbidHash, string calldata label) external onlyOwner {
        require(artistWallet[mbidHash] != address(0), "Not claimed");
        require(!isVerified[mbidHash], "Already verified");
        isVerified[mbidHash] = true;

        address wallet = artistWallet[mbidHash];

        uint256 balance = unclaimedBalance[mbidHash];
        if (balance > 0) {
            unclaimedBalance[mbidHash] = 0;
            usdc.transfer(wallet, balance);
        }

        if (address(ondaRegistrar) != address(0)) {
            ondaRegistrar.register(label, wallet);
        }

        emit ArtistVerified(mbidHash, wallet);
    }

    // --- Admin ---

    function setOndaRegistrar(address _registrar) external onlyOwner {
        ondaRegistrar = IOndaRegistrar(_registrar);
    }

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
}
