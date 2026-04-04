// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPatronEscrow {
    // --- State getters ---
    function usdc() external view returns (IERC20);
    function smartAccounts(address owner) external view returns (address);
    function tipNonce(address smartAccount) external view returns (uint256);
    function artistWallet(bytes32 mbidHash) external view returns (address);
    function isVerified(bytes32 mbidHash) external view returns (bool);
    function unclaimedBalance(bytes32 mbidHash) external view returns (uint256);
    function artistSubname(bytes32 mbidHash) external view returns (string memory);
    function subnameMbid(string calldata subname) external view returns (bytes32);
    function textRecords(bytes32 mbidHash, string calldata key) external view returns (string memory);
    function defaultTipAmount() external view returns (uint256);

    // --- Account management ---
    function join(address sessionKey) external returns (address smartAccount);

    // --- Tip processing ---
    function tipWithSignature(
        address smartAccount,
        bytes32 mbidHash,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external;

    // --- Artist registry ---
    function claimArtist(bytes32 mbidHash) external;
    function verifyAndRelease(bytes32 mbidHash) external;
    function registerArtist(bytes32 mbidHash, string calldata subname, address wallet) external;
    function setSubname(bytes32 mbidHash, string calldata subname) external;
    function resolveSubname(string calldata subname) external view returns (address);
    function setTextRecord(bytes32 mbidHash, string calldata key, string calldata value) external;
    function getTextRecord(bytes32 mbidHash, string calldata key) external view returns (string memory);
    function getArtistInfo(bytes32 mbidHash)
        external
        view
        returns (address wallet, bool verified, uint256 unclaimed);

    // --- Admin ---
    function setDefaultTipAmount(uint256 amount) external;
}
