// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPatronSmartAccount {
    // --- State getters ---
    function owner() external view returns (address);
    function escrow() external view returns (address);
    function usdc() external view returns (IERC20);
    function sessionKey() external view returns (address);

    // --- Session management ---
    /// @notice Update the session key. Callable by the owner or the escrow contract.
    function setSession(address newSession) external;

    // --- Fund management ---
    /// @notice Pull funds into the escrow for tip processing. Only callable by the escrow.
    function pull(uint256 amount) external;

    /// @notice Withdraw remaining balance to the owner wallet. Only callable by the owner.
    function withdraw(uint256 amount) external;

    /// @notice Returns the smart account's current USDC balance.
    function balance() external view returns (uint256);
}
