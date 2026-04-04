// Extension wallet — session key management and tip signing.
// The session key is only used for signing; it never holds funds.
// The user's real wallet calls PatronEscrow.join(sessionAddress) to link their account.

import {
  createPublicClient,
  http,
  keccak256,
  encodePacked,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const ARC_TESTNET = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
};

const ESCROW_ADDRESS = process.env.PATRON_ESCROW_ADDRESS;

const ESCROW_ABI = [
  {
    name: "tipNonce",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "smartAccount", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const JOINED_ABI = [
  {
    name: "Joined",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "smartAccount", type: "address", indexed: true },
      { name: "sessionKey", type: "address", indexed: true },
    ],
  },
];

const SMART_ACCOUNT_ABI = [
  {
    name: "sessionKey",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
];

function getPublicClient() {
  return createPublicClient({ chain: ARC_TESTNET, transport: http() });
}

// --- Session key lifecycle ---

/// Generates a session key on first install and persists it.
/// The session key address is what the user encodes in the QR code transaction.
export async function initSession() {
  const data = await chrome.storage.local.get(["sessionKey", "sessionAddress"]);
  if (data.sessionKey && data.sessionAddress) {
    return { sessionAddress: data.sessionAddress, isNew: false };
  }

  const sessionKey = generatePrivateKey();
  const account = privateKeyToAccount(sessionKey);

  await chrome.storage.local.set({
    sessionKey,
    sessionAddress: account.address,
  });

  return { sessionAddress: account.address, isNew: true };
}

/// Returns current account linkage state from storage.
export async function getAccountStatus() {
  const data = await chrome.storage.local.get([
    "sessionKey",
    "sessionAddress",
    "ownerAddress",
    "smartAccountAddress",
  ]);
  return {
    sessionAddress: data.sessionAddress || null,
    ownerAddress: data.ownerAddress || null,
    smartAccountAddress: data.smartAccountAddress || null,
    isLinked: !!(data.ownerAddress && data.smartAccountAddress),
  };
}

/// Returns a URL to the web app's /connect page with the session key as a query param.
/// Render this as a QR code — scanning opens the browser, not a wallet app.
/// Works for both first-time join and session rotation (reinstall).
export async function getJoinUri() {
  const { sessionAddress } = await chrome.storage.local.get(["sessionAddress"]);
  if (!sessionAddress) throw new Error("No session key initialised");
  return `${process.env.PATRON_WEB_URL}/connect?session=${sessionAddress}`;
}

/// Checks whether our session key has been linked on-chain.
/// First checks if we already know the smart account and verifies the session key is still active.
/// If no smart account is stored, falls back to scanning Joined event logs to discover the link.
/// Returns null if not yet linked.
export async function checkForJoin() {
  const data = await chrome.storage.local.get([
    "sessionAddress",
    "ownerAddress",
    "smartAccountAddress",
  ]);
  const { sessionAddress, ownerAddress, smartAccountAddress } = data;
  if (!sessionAddress) return null;

  const publicClient = getPublicClient();

  // If we already have a stored smart account, verify the session key is still active
  if (smartAccountAddress) {
    try {
      const onChainSession = await publicClient.readContract({
        address: smartAccountAddress,
        abi: SMART_ACCOUNT_ABI,
        functionName: "sessionKey",
      });
      if (onChainSession.toLowerCase() === sessionAddress.toLowerCase()) {
        return { ownerAddress, smartAccountAddress };
      }
      // Session key was rotated out — clear stale state so QR re-renders
      await chrome.storage.local.set({ ownerAddress: null, smartAccountAddress: null });
      return null;
    } catch (err) {
      console.error("[Patron] checkForJoin verify failed:", err);
      return null;
    }
  }

  // No smart account stored — scan historical Joined events to discover the link
  try {
    const logs = await publicClient.getContractEvents({
      address: ESCROW_ADDRESS,
      abi: JOINED_ABI,
      eventName: "Joined",
      args: { sessionKey: sessionAddress },
      fromBlock: 0n,
      toBlock: "latest",
    });
    if (logs.length === 0) return null;

    const { user: foundOwner, smartAccount: foundSmartAccount } = logs[0].args;
    await chrome.storage.local.set({
      ownerAddress: foundOwner,
      smartAccountAddress: foundSmartAccount,
    });
    return { ownerAddress: foundOwner, smartAccountAddress: foundSmartAccount };
  } catch (err) {
    console.error("[Patron] checkForJoin log scan failed:", err);
    return null;
  }
}

/// Subscribes to on-chain Joined events for our session key.
/// Calls onLinked({ ownerAddress, smartAccountAddress }) on detection.
/// Returns an unwatch function — call it when the popup closes.
export async function watchForJoin(onLinked) {
  const { sessionAddress } = await chrome.storage.local.get(["sessionAddress"]);
  if (!sessionAddress) return () => {};

  const publicClient = getPublicClient();

  const unwatch = publicClient.watchContractEvent({
    address: ESCROW_ADDRESS,
    abi: JOINED_ABI,
    eventName: "Joined",
    args: { sessionKey: sessionAddress },
    onLogs: async (logs) => {
      if (logs.length === 0) return;
      const { user: ownerAddress, smartAccount: smartAccountAddress } = logs[0].args;
      await chrome.storage.local.set({ ownerAddress, smartAccountAddress });
      onLinked({ ownerAddress, smartAccountAddress });
      unwatch();
    },
  });

  return unwatch;
}

// --- Tip signing ---

/// Signs a tip authorisation with the session key.
/// The signature proves the session key (linked to the user's smart account via PatronHub)
/// authorises a tip of `amount` to artist `mbidHash`.
/// The web app relays the signed tip on-chain and verifies with ecrecover.
export async function signTip(mbidHash, amount) {
  const data = await chrome.storage.local.get([
    "sessionKey",
    "sessionAddress",
    "smartAccountAddress",
  ]);
  if (!data.sessionKey) throw new Error("No session key");
  if (!data.smartAccountAddress) throw new Error("Account not linked — scan QR first");

  // Always fetch nonce from chain — avoids desync on reinstall
  const publicClient = getPublicClient();
  const nonce = Number(
    await publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "tipNonce",
      args: [data.smartAccountAddress],
    })
  );

  const account = privateKeyToAccount(data.sessionKey);

  // Hash: keccak256(smartAccount || mbidHash || amount || nonce)
  const hash = keccak256(
    encodePacked(
      ["address", "bytes32", "uint256", "uint256"],
      [data.smartAccountAddress, mbidHash, BigInt(amount), BigInt(nonce)]
    )
  );

  // Personal sign (EIP-191) so Solidity can recover with ECDSA.recover(hash, sig)
  const signature = await account.signMessage({ message: { raw: hash } });

  return {
    smartAccount: data.smartAccountAddress,
    sessionAddress: data.sessionAddress,
    mbidHash,
    amount,
    nonce,
    signature,
  };
}
