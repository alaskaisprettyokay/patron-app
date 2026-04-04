// Patron Wallet — session key model
// The extension holds a scoped session key that can only call tipDefault()
// on the PatronEscrow contract, via the listener's PatronAccount.
//
// Flow:
//   1. User connects their main wallet (MetaMask etc.) via the popup
//   2. PatronAccount is deployed (or already exists via factory)
//   3. User authorizes a session key generated here
//   4. Extension uses session key for silent auto-tipping
//   5. Session key can ONLY tip, with a daily spending cap

import { createWalletClient, createPublicClient, http, formatUnits, encodeFunctionData } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const ARC_TESTNET = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
};

// Contract addresses — update these after deployment
const ESCROW_ADDRESS = "0x0d790A857fcc8d2638426cA689Fd41Ee616Cf85E";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
// TODO: Set after deploying PatronAccountFactory
const FACTORY_ADDRESS = "0x0000000000000000000000000000000000000000";

// --- ABIs ---

const ESCROW_ABI = [
  {
    name: "tipDefault",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "mbidHash", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "listenerBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "defaultTipAmount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const ACCOUNT_ABI = [
  {
    name: "executeSession",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_target", type: "address" },
      { name: "_data", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
  {
    name: "sessionKeys",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
      { name: "spendLimit", type: "uint256" },
      { name: "spentThisPeriod", type: "uint256" },
      { name: "periodDuration", type: "uint256" },
      { name: "periodStart", type: "uint256" },
      { name: "validUntil", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
];

const FACTORY_ABI = [
  {
    name: "getAddress",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_owner", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
];

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
];

// --- Clients ---

function getPublicClient() {
  return createPublicClient({
    chain: ARC_TESTNET,
    transport: http(),
  });
}

function getSessionWalletClient(privateKey) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: ARC_TESTNET,
    transport: http(),
  });
}

// --- Storage helpers ---

// Stored data shape:
// {
//   sessionKey: "0x...",           // Session private key (scoped, low-value)
//   sessionAddress: "0x...",       // Derived public address
//   accountAddress: "0x...",       // PatronAccount contract address
//   ownerAddress: "0x...",         // Listener's main wallet address
//   setupComplete: boolean,
// }

async function getStoredWallet() {
  return chrome.storage.local.get([
    "sessionKey",
    "sessionAddress",
    "accountAddress",
    "ownerAddress",
    "setupComplete",
  ]);
}

// --- Exported API ---

/**
 * Generate a session keypair. Does NOT authorize it on-chain yet.
 * Called during initial setup before the user authorizes via their main wallet.
 */
export async function initSessionKey() {
  const data = await getStoredWallet();
  if (data.sessionKey && data.sessionAddress) {
    return { sessionAddress: data.sessionAddress, isNew: false };
  }

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  await chrome.storage.local.set({
    sessionKey: privateKey,
    sessionAddress: account.address,
  });

  return { sessionAddress: account.address, isNew: true };
}

/**
 * Complete setup after user has:
 *   1. Deployed their PatronAccount (or it already exists)
 *   2. Called authorizeSession() on it from their main wallet
 *
 * The popup passes in the account address and owner address.
 * We verify the session key is actually authorized on-chain.
 */
export async function completeSetup(accountAddress, ownerAddress) {
  const data = await getStoredWallet();
  if (!data.sessionKey) throw new Error("No session key — run initSessionKey first");

  const publicClient = getPublicClient();

  // Verify: is our session key authorized on this account?
  const session = await publicClient.readContract({
    address: accountAddress,
    abi: ACCOUNT_ABI,
    functionName: "sessionKeys",
    args: [data.sessionAddress],
  });

  const [target, , , , , , validUntil, active] = session;

  if (!active) throw new Error("Session key not authorized on this account");
  if (target.toLowerCase() !== ESCROW_ADDRESS.toLowerCase()) {
    throw new Error("Session key target is not the escrow contract");
  }
  if (BigInt(validUntil) <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error("Session key is already expired");
  }

  await chrome.storage.local.set({
    accountAddress,
    ownerAddress,
    setupComplete: true,
  });

  console.log("[Patron] Setup complete. Account:", accountAddress, "Session key:", data.sessionAddress);
  return { accountAddress, sessionAddress: data.sessionAddress };
}

/**
 * Get wallet info for display in popup and bridge.
 * Returns account address, balances, and session key status.
 */
export async function getWalletInfo() {
  const data = await getStoredWallet();

  // Not set up yet — return session address for setup flow
  if (!data.setupComplete) {
    return {
      setupComplete: false,
      sessionAddress: data.sessionAddress || null,
      accountAddress: null,
    };
  }

  const publicClient = getPublicClient();
  const accountAddr = data.accountAddress;

  try {
    // Read balances for the PatronAccount (not the session key)
    const [escrowBalance, session] = await Promise.all([
      publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "listenerBalance",
        args: [accountAddr],
      }),
      publicClient.readContract({
        address: accountAddr,
        abi: ACCOUNT_ABI,
        functionName: "sessionKeys",
        args: [data.sessionAddress],
      }),
    ]);

    const [, , spendLimit, spentThisPeriod, periodDuration, periodStart, validUntil, active] = session;

    const now = BigInt(Math.floor(Date.now() / 1000));
    // If period has elapsed, spentThisPeriod effectively resets
    const periodElapsed = now >= BigInt(periodStart) + BigInt(periodDuration);
    const effectiveSpent = periodElapsed ? 0n : BigInt(spentThisPeriod);
    const remainingBudget = BigInt(spendLimit) - effectiveSpent;

    return {
      setupComplete: true,
      address: accountAddr,
      ownerAddress: data.ownerAddress,
      sessionAddress: data.sessionAddress,
      escrowBalance: formatUnits(escrowBalance, 6),
      rawEscrowBalance: escrowBalance.toString(),
      session: {
        active,
        expired: now > BigInt(validUntil),
        validUntil: Number(validUntil),
        spendLimit: formatUnits(BigInt(spendLimit), 6),
        spentThisPeriod: formatUnits(effectiveSpent, 6),
        remainingBudget: formatUnits(remainingBudget > 0n ? remainingBudget : 0n, 6),
      },
    };
  } catch (err) {
    return {
      setupComplete: true,
      address: accountAddr,
      sessionAddress: data.sessionAddress,
      error: err.message,
    };
  }
}

/**
 * Send a tip using the session key.
 * Calls PatronAccount.executeSession() which forwards tipDefault() to escrow.
 * The session key can ONLY do this — nothing else.
 */
export async function sendTip(mbidHash) {
  const data = await getStoredWallet();
  if (!data.sessionKey || !data.accountAddress) {
    throw new Error("Wallet not set up");
  }

  const publicClient = getPublicClient();
  const walletClient = getSessionWalletClient(data.sessionKey);

  // Encode the inner call: escrow.tipDefault(mbidHash)
  const tipCalldata = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: "tipDefault",
    args: [mbidHash],
  });

  // Call account.executeSession(escrowAddress, tipCalldata)
  // The account contract validates: correct target, correct selector, under spend cap, not expired
  const txHash = await walletClient.writeContract({
    address: data.accountAddress,
    abi: ACCOUNT_ABI,
    functionName: "executeSession",
    args: [ESCROW_ADDRESS, tipCalldata],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}

/**
 * Predict the PatronAccount address for a given owner wallet.
 * Used during setup so the user knows what address to interact with.
 */
export async function predictAccountAddress(ownerAddress) {
  const publicClient = getPublicClient();
  const predicted = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getAddress",
    args: [ownerAddress],
  });
  return predicted;
}

/**
 * Reset wallet state. Used if user wants to disconnect or re-setup.
 */
export async function resetWallet() {
  await chrome.storage.local.remove([
    "sessionKey",
    "sessionAddress",
    "accountAddress",
    "ownerAddress",
    "setupComplete",
  ]);
  return { reset: true };
}

// =====================================================
// DEPRECATED — kept temporarily for migration
// The old initWallet/approveAndDeposit functions used a raw EOA.
// These are no longer called but preserved so the service worker
// doesn't break before all references are updated.
// =====================================================

export async function initWallet() {
  // Redirect to new flow
  return initSessionKey();
}

export async function approveAndDeposit() {
  throw new Error(
    "Direct deposit no longer supported. Use your main wallet to deposit into your PatronAccount."
  );
}
