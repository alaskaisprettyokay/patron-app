// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPatronEscrow.sol";

/// @notice Minimal smart account deployed by PatronEscrow when a user calls join().
///         Holds USDC on behalf of the listener. The escrow can pull funds to process tips.
///         The user can rotate the session key (e.g. after reinstalling the extension).
contract PatronSmartAccount {
    address public immutable owner;
    address public immutable escrow;
    IERC20 public immutable usdc;

    address public sessionKey;

    event SessionUpdated(address indexed smartAccount, address indexed newSessionKey);

    constructor(address _owner, address _sessionKey) {
        owner = _owner;
        escrow = msg.sender;
        usdc = IPatronEscrow(msg.sender).usdc();
        sessionKey = _sessionKey;
    }

    /// @notice Update the session key. Callable by the owner directly or by the escrow
    ///         contract (which gates the call behind msg.sender == owner in join()).
    function setSession(address newSession) external {
        require(msg.sender == owner || msg.sender == escrow, "Unauthorized");
        sessionKey = newSession;
        emit SessionUpdated(address(this), newSession);
    }

    /// @notice Called by the escrow to pull funds for tip processing.
    function pull(uint256 amount) external {
        require(msg.sender == escrow, "Only escrow");
        usdc.transfer(escrow, amount);
    }

    /// @notice Owner can withdraw remaining balance directly.
    function withdraw(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        usdc.transfer(owner, amount);
    }

    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
