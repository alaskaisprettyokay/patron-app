// Embedded wallet for silent auto-tipping
// Generates a session key, signs transactions, broadcasts to Arc testnet

import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const ARC_TESTNET = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
};

const ESCROW_ADDRESS = "0x0d790A857fcc8d2638426cA689Fd41Ee616Cf85E";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

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

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
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

function getPublicClient() {
  return createPublicClient({
    chain: ARC_TESTNET,
    transport: http(),
  });
}

function getWalletClient(privateKey) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: ARC_TESTNET,
    transport: http(),
  });
}

// --- Exported API (called from service worker via message passing) ---

export async function initWallet() {
  const data = await chrome.storage.local.get(["walletKey", "walletAddress"]);
  if (data.walletKey && data.walletAddress) {
    return { address: data.walletAddress, isNew: false };
  }

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  await chrome.storage.local.set({
    walletKey: privateKey,
    walletAddress: account.address,
  });

  return { address: account.address, isNew: true };
}

export async function getWalletInfo() {
  const data = await chrome.storage.local.get(["walletKey", "walletAddress"]);
  if (!data.walletKey) return null;

  const publicClient = getPublicClient();
  const address = data.walletAddress;

  try {
    const [usdcBalance, escrowBalance, allowance] = await Promise.all([
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      }),
      publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "listenerBalance",
        args: [address],
      }),
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, ESCROW_ADDRESS],
      }),
    ]);

    return {
      address,
      usdcBalance: formatUnits(usdcBalance, 6),
      escrowBalance: formatUnits(escrowBalance, 6),
      hasAllowance: allowance > 0n,
      rawUsdcBalance: usdcBalance.toString(),
      rawEscrowBalance: escrowBalance.toString(),
    };
  } catch (err) {
    return { address, error: err.message };
  }
}

export async function approveAndDeposit() {
  const data = await chrome.storage.local.get(["walletKey", "walletAddress"]);
  if (!data.walletKey) throw new Error("No wallet");

  const publicClient = getPublicClient();
  const walletClient = getWalletClient(data.walletKey);

  // Check USDC balance
  console.log("[Patron] approveAndDeposit: checking balance...");
  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [data.walletAddress],
  });
  console.log("[Patron] USDC balance:", usdcBalance.toString());

  if (usdcBalance === 0n) throw new Error("No USDC balance to deposit");

  // Reserve USDC for gas (Arc uses USDC as native gas token, shared pool)
  // Reserve $0.10 for ~100 future tip transactions
  const GAS_RESERVE = 100000n; // $0.10 in 6 decimals
  const depositAmount = usdcBalance > GAS_RESERVE ? usdcBalance - GAS_RESERVE : 0n;
  if (depositAmount === 0n) throw new Error("Balance too low (need >$0.10 for gas reserve)");
  console.log("[Patron] Depositing:", depositAmount.toString(), "(reserving gas)");

  // Check allowance
  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [data.walletAddress, ESCROW_ADDRESS],
  });
  console.log("[Patron] Current allowance:", allowance.toString());

  // Approve if needed
  if (allowance < depositAmount) {
    console.log("[Patron] Sending approve tx...");
    try {
      const approveTx = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ESCROW_ADDRESS, depositAmount],
      });
      console.log("[Patron] Approve tx sent:", approveTx);
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
      console.log("[Patron] Approve confirmed");
    } catch (err) {
      console.error("[Patron] Approve failed:", err);
      throw new Error(`Approve failed: ${err.shortMessage || err.message}`);
    }
  }

  // Deposit all USDC into escrow
  console.log("[Patron] Sending deposit tx...");
  try {
    const depositTx = await walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "deposit",
      args: [depositAmount],
    });
    console.log("[Patron] Deposit tx sent:", depositTx);
    await publicClient.waitForTransactionReceipt({ hash: depositTx });
    console.log("[Patron] Deposit confirmed");
    return { txHash: depositTx, amount: formatUnits(depositAmount, 6) };
  } catch (err) {
    console.error("[Patron] Deposit failed:", err);
    throw new Error(`Deposit failed: ${err.shortMessage || err.message}`);
  }
}

export async function sendTip(mbidHash) {
  const data = await chrome.storage.local.get(["walletKey"]);
  if (!data.walletKey) throw new Error("No wallet");

  const publicClient = getPublicClient();
  const walletClient = getWalletClient(data.walletKey);

  const txHash = await walletClient.writeContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "tipDefault",
    args: [mbidHash],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}
