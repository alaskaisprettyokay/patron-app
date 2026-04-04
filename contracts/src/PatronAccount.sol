// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * PatronAccount — Minimal smart account with scoped session keys.
 *
 * ARCHITECTURE OVERVIEW
 * =====================
 * Instead of storing a raw EOA private key in the browser extension,
 * the listener deploys (or has deployed for them) a PatronAccount.
 * They then authorize a "session key" — a throwaway keypair generated
 * by the extension — with strict constraints:
 *
 *   - Can ONLY call tipDefault() on the PatronEscrow contract
 *   - Subject to a per-period spending cap (e.g., $2/day)
 *   - Expires after a set time (e.g., 30 days)
 *   - Revocable at any time by the account owner
 *
 * If the session key is compromised, the worst case is an attacker
 * tips artists up to the remaining daily cap. They cannot withdraw,
 * transfer, or call any other function.
 *
 * INTEGRATION WITH EXISTING CONTRACTS
 * ====================================
 * PatronEscrow tracks `listenerBalance[msg.sender]`. With this design,
 * `msg.sender` becomes the PatronAccount address (not the EOA).
 * The listener deposits USDC into escrow via the PatronAccount, and
 * tips are debited from the PatronAccount's escrow balance.
 *
 * No changes to PatronEscrow are required.
 *
 * FLOW
 * ====
 * 1. Listener deploys PatronAccount (or via factory — see below)
 * 2. Listener calls account.authorizeSession(...) from their main wallet
 *    - Sets: session key address, escrow address, spending limit, expiry
 * 3. Extension stores the session private key (low-value, scoped)
 * 4. Extension calls account.executeSession(...) to tip
 *    - Account validates: caller is session key, target is escrow,
 *      function is tipDefault, spending cap not exceeded, not expired
 *    - Account forwards the call to PatronEscrow
 * 5. Listener can revoke session key at any time
 *
 * ARC NETWORK
 * ===========
 * Arc uses USDC as both the tipping currency AND the native gas token.
 * This simplifies things: the session key needs a small USDC balance for gas,
 * and we can fund it directly from the account. The owner can call
 * fundSessionKey() to top up gas, or authorizeSession() can auto-fund.
 *
 * NOTE FOR CONTRACT DEV
 * =====================
 * This is an architecture sketch, not production code. Consider:
 * - ERC-4337 compatibility if you want paymaster/bundler support
 * - Using a factory pattern (CREATE2) for deterministic account addresses
 * - EIP-1271 signature validation if needed
 * - Upgradability via proxy pattern
 * - More granular permission system if future features need it
 */
contract PatronAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // =====================================================
    // STATE
    // =====================================================

    address public owner; // Listener's main wallet (MetaMask, etc.)

    struct SessionKey {
        address target;       // Only contract this key can call (PatronEscrow)
        bytes4 selector;      // Only function selector allowed (tipDefault)
        uint256 spendLimit;   // Max USDC spend per period (in base units, 6 decimals)
        uint256 spentThisPeriod; // Running spend counter
        uint256 periodDuration;  // Length of each period in seconds (e.g., 86400 = 1 day)
        uint256 periodStart;     // Timestamp when current period began
        uint256 validUntil;      // Session key expiry (unix timestamp)
        bool active;
    }

    // session key address => session config
    mapping(address => SessionKey) public sessionKeys;

    // =====================================================
    // EVENTS
    // =====================================================

    event SessionAuthorized(
        address indexed sessionKey,
        address indexed target,
        uint256 spendLimit,
        uint256 periodDuration,
        uint256 validUntil
    );
    event SessionRevoked(address indexed sessionKey);
    event SessionExecuted(address indexed sessionKey, address indexed target, bytes4 selector);
    event SessionKeyFunded(address indexed sessionKey, uint256 amount);

    // =====================================================
    // MODIFIERS
    // =====================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    constructor(address _owner) {
        owner = _owner;
    }

    // =====================================================
    // OWNER FUNCTIONS
    // =====================================================

    /**
     * Authorize a session key for the browser extension.
     *
     * On Arc, USDC is the native gas token. Pass a gasStipend to
     * auto-fund the session key so it can pay for tx fees.
     * e.g., 100000 = $0.10 USDC = ~100 tip transactions.
     *
     * Example usage (from listener's main wallet):
     *   authorizeSession(
     *     0xABCD...,                           // extension-generated pubkey
     *     0x1234...,                           // PatronEscrow address
     *     0x8f39d613,                          // bytes4(keccak256("tipDefault(bytes32)"))
     *     2_000_000,                           // 2 USDC per period (6 decimals)
     *     86400,                               // 1 day period
     *     block.timestamp + 30 days,           // expires in 30 days
     *     100000                               // $0.10 gas stipend
     *   )
     */
    function authorizeSession(
        address _key,
        address _target,
        bytes4 _selector,
        uint256 _spendLimit,
        uint256 _periodDuration,
        uint256 _validUntil,
        uint256 _gasStipend
    ) external onlyOwner {
        require(_key != address(0), "Invalid key");
        require(_validUntil > block.timestamp, "Already expired");
        require(_periodDuration > 0, "Period must be > 0");

        sessionKeys[_key] = SessionKey({
            target: _target,
            selector: _selector,
            spendLimit: _spendLimit,
            spentThisPeriod: 0,
            periodDuration: _periodDuration,
            periodStart: block.timestamp,
            validUntil: _validUntil,
            active: true
        });

        // Fund session key with gas (USDC is native currency on Arc)
        if (_gasStipend > 0) {
            (bool sent, ) = _key.call{value: _gasStipend}("");
            require(sent, "Gas stipend transfer failed");
            emit SessionKeyFunded(_key, _gasStipend);
        }

        emit SessionAuthorized(_key, _target, _spendLimit, _periodDuration, _validUntil);
    }

    /**
     * Top up a session key's gas balance.
     * On Arc, this sends native USDC for transaction fees.
     */
    function fundSessionKey(address _key, uint256 _amount) external onlyOwner {
        require(sessionKeys[_key].active, "Session not active");
        (bool sent, ) = _key.call{value: _amount}("");
        require(sent, "Transfer failed");
        emit SessionKeyFunded(_key, _amount);
    }

    function revokeSession(address _key) external onlyOwner {
        sessionKeys[_key].active = false;
        emit SessionRevoked(_key);
    }

    // =====================================================
    // SESSION KEY EXECUTION
    // =====================================================

    /**
     * Called by the browser extension using the session key.
     *
     * The extension calls:
     *   executeSession(
     *     escrowAddress,
     *     abi.encodeWithSelector(PatronEscrow.tipDefault.selector, mbidHash)
     *   )
     *
     * This function validates every constraint before forwarding the call.
     */
    function executeSession(
        address _target,
        bytes calldata _data
    ) external returns (bytes memory) {
        SessionKey storage session = sessionKeys[msg.sender];

        // 1. Session must be active
        require(session.active, "Session not active");

        // 2. Session must not be expired
        require(block.timestamp <= session.validUntil, "Session expired");

        // 3. Target contract must match (can only call PatronEscrow)
        require(_target == session.target, "Target not allowed");

        // 4. Function selector must match (can only call tipDefault)
        require(_data.length >= 4, "Invalid calldata");
        bytes4 selector = bytes4(_data[:4]);
        require(selector == session.selector, "Function not allowed");

        // 5. Check and update spending cap
        _enforceSpendLimit(session);

        // 6. Forward the call
        (bool success, bytes memory result) = _target.call(_data);
        require(success, "Execution failed");

        emit SessionExecuted(msg.sender, _target, selector);
        return result;
    }

    /**
     * Enforce the per-period spending limit.
     * Resets the counter if a new period has begun.
     */
    function _enforceSpendLimit(SessionKey storage session) internal {
        // Reset period if enough time has passed
        if (block.timestamp >= session.periodStart + session.periodDuration) {
            session.periodStart = block.timestamp;
            session.spentThisPeriod = 0;
        }

        // NOTE: We use the escrow's defaultTipAmount here. For a more robust
        // implementation, decode the tip amount from calldata or read it from
        // the escrow contract. For now, we read it on each call.
        //
        // Your contract dev can choose between:
        //   a) Hardcode the default tip amount here
        //   b) Read PatronEscrow(session.target).defaultTipAmount()
        //   c) Track total spend by monitoring USDC balance changes
        //
        // Option (b) is shown below:
        (bool ok, bytes memory data) = session.target.staticcall(
            abi.encodeWithSignature("defaultTipAmount()")
        );
        require(ok, "Could not read tip amount");
        uint256 tipAmount = abi.decode(data, (uint256));

        require(
            session.spentThisPeriod + tipAmount <= session.spendLimit,
            "Spend limit exceeded"
        );
        session.spentThisPeriod += tipAmount;
    }

    // =====================================================
    // OWNER CONVENIENCE: deposit/withdraw through account
    // =====================================================

    /**
     * Owner deposits USDC into escrow through this account.
     * The escrow sees msg.sender = this PatronAccount address.
     */
    function depositToEscrow(address _escrow, address _usdc, uint256 _amount) external onlyOwner {
        IERC20(_usdc).approve(_escrow, _amount);
        (bool success, ) = _escrow.call(
            abi.encodeWithSignature("deposit(uint256)", _amount)
        );
        require(success, "Deposit failed");
    }

    /**
     * Owner withdraws USDC from escrow back through this account.
     */
    function withdrawFromEscrow(address _escrow, uint256 _amount) external onlyOwner {
        (bool success, ) = _escrow.call(
            abi.encodeWithSignature("withdraw(uint256)", _amount)
        );
        require(success, "Withdraw failed");
    }

    /**
     * Owner can rescue any ERC20 tokens sent to this account.
     */
    function rescueToken(address _token, address _to, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(_to, _amount);
    }

    // Allow receiving native currency if needed for gas
    receive() external payable {}
}


// =====================================================
// FACTORY (optional but recommended)
// =====================================================

/**
 * Deploys PatronAccount instances with CREATE2 for deterministic addresses.
 * This lets the extension predict the account address before deployment.
 *
 * Flow:
 *   1. Extension computes: address = factory.getAddress(listenerWallet)
 *   2. Listener can pre-fund the address with USDC
 *   3. Listener calls factory.createAccount(listenerWallet) to deploy
 *   4. Account is ready for session key authorization
 */
contract PatronAccountFactory {
    event AccountCreated(address indexed owner, address indexed account);

    function createAccount(address _owner) external returns (PatronAccount) {
        // Use owner address as salt for deterministic deployment
        bytes32 salt = bytes32(uint256(uint160(_owner)));
        PatronAccount account = new PatronAccount{salt: salt}(_owner);
        emit AccountCreated(_owner, address(account));
        return account;
    }

    function getAddress(address _owner) external view returns (address) {
        bytes32 salt = bytes32(uint256(uint160(_owner)));
        bytes memory bytecode = abi.encodePacked(
            type(PatronAccount).creationCode,
            abi.encode(_owner)
        );
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode))
        );
        return address(uint160(uint256(hash)));
    }
}
