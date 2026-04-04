// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PatronEscrow is Ownable {
    IERC20 public usdc;

    // Listener balances (deposited USDC)
    mapping(address => uint256) public listenerBalance;

    // Unclaimed artist balances (by MusicBrainz MBID hash)
    mapping(bytes32 => uint256) public unclaimedBalance;

    // Claimed artist wallets
    mapping(bytes32 => address) public artistWallet;

    // Verified artists
    mapping(bytes32 => bool) public isVerified;

    // Total tipped per listener
    mapping(address => uint256) public totalTipped;

    // --- Decentralized attestor system ---
    mapping(address => bool) public isAttestor;
    uint256 public attestorCount;
    uint256 public attestationThreshold;

    // attestations[mbidHash][attestor] = true
    mapping(bytes32 => mapping(address => bool)) public hasAttested;
    mapping(bytes32 => uint256) public attestationCount;

    // Tip amount (default 0.01 USDC = 10000 in 6 decimals)
    uint256 public defaultTipAmount = 10000;

    // Events
    event Deposited(address indexed listener, uint256 amount);
    event Withdrawn(address indexed listener, uint256 amount);
    event Tipped(address indexed listener, bytes32 indexed mbidHash, uint256 amount);
    event ArtistClaimed(bytes32 indexed mbidHash, address indexed wallet);
    event ArtistVerified(bytes32 indexed mbidHash, address indexed wallet);
    event AttestorAdded(address indexed attestor);
    event AttestorRemoved(address indexed attestor);
    event AttestationSubmitted(bytes32 indexed mbidHash, address indexed attestor, uint256 count);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        attestationThreshold = 1; // Default: 1 attestation needed
    }

    // --- Attestor management (owner only) ---

    function addAttestor(address attestor) external onlyOwner {
        require(!isAttestor[attestor], "Already attestor");
        isAttestor[attestor] = true;
        attestorCount++;
        emit AttestorAdded(attestor);
    }

    function removeAttestor(address attestor) external onlyOwner {
        require(isAttestor[attestor], "Not attestor");
        isAttestor[attestor] = false;
        attestorCount--;
        emit AttestorRemoved(attestor);
    }

    function setAttestationThreshold(uint256 threshold) external onlyOwner {
        require(threshold > 0, "Threshold must be > 0");
        attestationThreshold = threshold;
    }

    // --- Listener functions ---

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        usdc.transferFrom(msg.sender, address(this), amount);
        listenerBalance[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(listenerBalance[msg.sender] >= amount, "Insufficient balance");
        listenerBalance[msg.sender] -= amount;
        usdc.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function tip(bytes32 mbidHash, uint256 amount) external {
        require(listenerBalance[msg.sender] >= amount, "Insufficient balance");
        listenerBalance[msg.sender] -= amount;
        totalTipped[msg.sender] += amount;

        address wallet = artistWallet[mbidHash];
        if (wallet != address(0) && isVerified[mbidHash]) {
            // Artist claimed and verified — send directly
            usdc.transfer(wallet, amount);
        } else {
            // Unclaimed — escrow
            unclaimedBalance[mbidHash] += amount;
        }
        emit Tipped(msg.sender, mbidHash, amount);
    }

    function tipDefault(bytes32 mbidHash) external {
        // Convenience function using default tip amount
        uint256 amount = defaultTipAmount;
        require(listenerBalance[msg.sender] >= amount, "Insufficient balance");
        listenerBalance[msg.sender] -= amount;
        totalTipped[msg.sender] += amount;

        address wallet = artistWallet[mbidHash];
        if (wallet != address(0) && isVerified[mbidHash]) {
            usdc.transfer(wallet, amount);
        } else {
            unclaimedBalance[mbidHash] += amount;
        }
        emit Tipped(msg.sender, mbidHash, amount);
    }

    // --- Artist claim & verification ---

    function claimArtist(bytes32 mbidHash) external {
        require(artistWallet[mbidHash] == address(0), "Already claimed");
        artistWallet[mbidHash] = msg.sender;
        emit ArtistClaimed(mbidHash, msg.sender);
    }

    /**
     * @notice Returns the verification challenge for a claimed artist.
     * The artist must place this hex string on their linked website
     * so attestors can independently verify ownership.
     */
    function getVerificationChallenge(bytes32 mbidHash) external view returns (bytes32) {
        require(artistWallet[mbidHash] != address(0), "Not claimed");
        return keccak256(abi.encodePacked(mbidHash, artistWallet[mbidHash], "patron-verify"));
    }

    /**
     * @notice Attestors call this after independently verifying the artist placed
     * the challenge on their website. When threshold is met, artist is auto-verified
     * and escrowed funds are released.
     */
    function attestVerification(bytes32 mbidHash) external {
        require(isAttestor[msg.sender], "Not an attestor");
        require(artistWallet[mbidHash] != address(0), "Not claimed");
        require(!isVerified[mbidHash], "Already verified");
        require(!hasAttested[mbidHash][msg.sender], "Already attested");

        hasAttested[mbidHash][msg.sender] = true;
        attestationCount[mbidHash]++;

        emit AttestationSubmitted(mbidHash, msg.sender, attestationCount[mbidHash]);

        // Auto-verify when threshold is met
        if (attestationCount[mbidHash] >= attestationThreshold) {
            _verifyAndRelease(mbidHash);
        }
    }

    /**
     * @notice Owner can still directly verify (backwards compatible).
     * Useful for bootstrapping before attestors are onboarded.
     */
    function verifyAndRelease(bytes32 mbidHash) external onlyOwner {
        require(artistWallet[mbidHash] != address(0), "Not claimed");
        _verifyAndRelease(mbidHash);
    }

    function _verifyAndRelease(bytes32 mbidHash) internal {
        if (isVerified[mbidHash]) return; // idempotent
        isVerified[mbidHash] = true;

        uint256 balance = unclaimedBalance[mbidHash];
        if (balance > 0) {
            unclaimedBalance[mbidHash] = 0;
            usdc.transfer(artistWallet[mbidHash], balance);
        }
        emit ArtistVerified(mbidHash, artistWallet[mbidHash]);
    }

    function setDefaultTipAmount(uint256 amount) external onlyOwner {
        defaultTipAmount = amount;
    }

    // View helpers
    function getArtistInfo(bytes32 mbidHash) external view returns (address wallet, bool verified, uint256 unclaimed) {
        return (artistWallet[mbidHash], isVerified[mbidHash], unclaimedBalance[mbidHash]);
    }
}
