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

    /// @notice Called by the relayer after off-chain verification.
    ///         The artist signs (mbidHash ‖ label) off-chain — no on-chain tx required from them.
    ///         Claims the artist slot, verifies, releases escrowed tips, and mints their onda.eth subname.
    /// @param mbidHash  keccak256 of the artist's MusicBrainz ID.
    /// @param label     ENS label to mint, e.g. "radiohead" for "radiohead.onda.eth".
    /// @param artist    The artist's wallet address (must match ecrecover of signature).
    /// @param signature EIP-191 personal_sign of keccak256(mbidHash ‖ label).
    function verifyAndRelease(
        bytes32 mbidHash,
        string calldata label,
        address artist,
        bytes calldata signature
    ) external onlyOwner {
        // Verify artist signed their claim intent
        bytes32 digest = keccak256(abi.encodePacked(mbidHash, label));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(digest);
        address signer = ECDSA.recover(ethHash, signature);
        require(signer == artist, "Invalid signature");

        require(!isVerified[mbidHash], "Already verified");

        // Register artist wallet (allow idempotent re-submission by same wallet)
        if (artistWallet[mbidHash] == address(0)) {
            artistWallet[mbidHash] = artist;
            emit ArtistClaimed(mbidHash, artist);
        } else {
            require(artistWallet[mbidHash] == artist, "Already claimed by different wallet");
        }

        isVerified[mbidHash] = true;

        uint256 balance = unclaimedBalance[mbidHash];
        if (balance > 0) {
            unclaimedBalance[mbidHash] = 0;
            usdc.transfer(artist, balance);
        }

        if (address(ondaRegistrar) != address(0)) {
            ondaRegistrar.register(label, artist);
        }

        emit ArtistVerified(mbidHash, artist);
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
