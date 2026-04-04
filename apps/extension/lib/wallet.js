// Minimal on-chain wallet for the extension
// Signs and sends tipDefault(mbidHash) transactions to PatronEscrow

const ARC_RPC = "https://rpc.testnet.arc.network";
const CHAIN_ID = 5042002;
const ESCROW_ADDRESS = "0x0d790A857fcc8d2638426cA689Fd41Ee616Cf85E";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

// tipDefault(bytes32) selector = keccak256("tipDefault(bytes32)").slice(0,10)
const TIP_DEFAULT_SELECTOR = "0x9cbafa1e";
// deposit(uint256) selector
const DEPOSIT_SELECTOR = "0xb6b55f25";
// approve(address,uint256) selector
const APPROVE_SELECTOR = "0x095ea7b3";
// balanceOf(address) selector
const BALANCE_OF_SELECTOR = "0x70a08231";
// listenerBalance(address) selector
const LISTENER_BALANCE_SELECTOR = "0xc68e0cdb";

// --- Crypto helpers (no dependencies) ---

function hexToBytes(hex) {
  hex = hex.replace(/^0x/, "");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function padLeft(hex, bytes) {
  hex = hex.replace(/^0x/, "");
  return hex.padStart(bytes * 2, "0");
}

function encodeUint256(value) {
  return padLeft(BigInt(value).toString(16), 32);
}

function encodeAddress(addr) {
  return padLeft(addr.replace(/^0x/, ""), 32);
}

// --- RPC calls ---

async function rpcCall(method, params) {
  const res = await fetch(ARC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function getNonce(address) {
  const result = await rpcCall("eth_getTransactionCount", [address, "latest"]);
  return parseInt(result, 16);
}

async function getGasPrice() {
  const result = await rpcCall("eth_gasPrice", []);
  return result;
}

async function callView(to, data) {
  return rpcCall("eth_call", [{ to, data }, "latest"]);
}

// --- Public API ---

export async function getWallet() {
  const data = await chrome.storage.local.get(["walletKey", "walletAddress"]);
  if (data.walletKey && data.walletAddress) {
    return { privateKey: data.walletKey, address: data.walletAddress };
  }
  return null;
}

export async function importWallet(privateKey) {
  // Derive address from private key using secp256k1
  // For simplicity, we use the eth_accounts approach — ask user for their address
  // Or use SubtleCrypto (not available for secp256k1 in browsers)
  // For the demo: store key and derive address via a signing trick

  // We'll derive the address by sending a dummy call to get it
  // Actually, let's just ask for both
  throw new Error("Use importWalletWithAddress instead");
}

export async function importWalletWithAddress(privateKey, address) {
  await chrome.storage.local.set({
    walletKey: privateKey,
    walletAddress: address.toLowerCase(),
  });
  return { privateKey, address: address.toLowerCase() };
}

export async function getUSDCBalance(address) {
  const data = BALANCE_OF_SELECTOR + encodeAddress(address);
  const result = await callView(USDC_ADDRESS, data);
  return BigInt(result);
}

export async function getEscrowBalance(address) {
  const data = LISTENER_BALANCE_SELECTOR + encodeAddress(address);
  const result = await callView(ESCROW_ADDRESS, data);
  return BigInt(result);
}

export async function sendTipDefault(mbidHash) {
  const wallet = await getWallet();
  if (!wallet) throw new Error("No wallet configured");

  // Encode tipDefault(bytes32) calldata
  const calldata = TIP_DEFAULT_SELECTOR + padLeft(mbidHash.replace(/^0x/, ""), 32);

  // Build and send transaction
  const nonce = await getNonce(wallet.address);
  const gasPrice = await getGasPrice();

  const tx = {
    from: wallet.address,
    to: ESCROW_ADDRESS,
    data: calldata,
    nonce: "0x" + nonce.toString(16),
    gasPrice,
    gas: "0x30000", // 196608 gas limit
    value: "0x0",
    chainId: "0x" + CHAIN_ID.toString(16),
  };

  // Sign with eth_sendTransaction won't work (no node wallet)
  // We need to sign locally — but that requires secp256k1 which isn't in Web Crypto
  // For the demo, we use the RPC's personal_sendTransaction or a fetch to our API

  // Simplest: relay through our API which has the private key
  // The API signs and submits on behalf of the user
  const res = await fetch("http://localhost:3000/api/relay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "tipDefault",
      mbidHash,
      senderAddress: wallet.address,
      senderKey: wallet.privateKey,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Relay failed");
  }

  return res.json();
}
