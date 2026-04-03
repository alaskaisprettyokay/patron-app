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

    // Tip amount (default 0.05 USDC = 50000 in 6 decimals)
    uint256 public defaultTipAmount = 50000;

    // Events
    event Deposited(address indexed listener, uint256 amount);
    event Withdrawn(address indexed listener, uint256 amount);
    event Tipped(address indexed listener, bytes32 indexed mbidHash, uint256 amount);
    event ArtistClaimed(bytes32 indexed mbidHash, address indexed wallet);
    event ArtistVerified(bytes32 indexed mbidHash, address indexed wallet);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

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

    function claimArtist(bytes32 mbidHash) external {
        require(artistWallet[mbidHash] == address(0), "Already claimed");
        artistWallet[mbidHash] = msg.sender;
        emit ArtistClaimed(mbidHash, msg.sender);
    }

    // Called by owner after off-chain verification
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

    function setDefaultTipAmount(uint256 amount) external onlyOwner {
        defaultTipAmount = amount;
    }

    // View helpers
    function getArtistInfo(bytes32 mbidHash) external view returns (address wallet, bool verified, uint256 unclaimed) {
        return (artistWallet[mbidHash], isVerified[mbidHash], unclaimedBalance[mbidHash]);
    }
}
