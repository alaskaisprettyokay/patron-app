import { type Address, formatUnits, keccak256, toBytes } from "viem";

export const PATRON_ESCROW_ABI = [
  // --- Account management ---
  {
    name: "join",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "sessionKey", type: "address" }],
    outputs: [{ name: "smartAccount", type: "address" }],
  },
  // --- Tip processing ---
  {
    name: "tipWithSignature",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "smartAccount", type: "address" },
      { name: "mbidHash", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  // --- Artist self-service ---
  {
    name: "claimArtist",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "mbidHash", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "verifyAndRelease",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "mbidHash", type: "bytes32" },
      { name: "label", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "setDefaultTipAmount",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getArtistInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "mbidHash", type: "bytes32" }],
    outputs: [
      { name: "wallet", type: "address" },
      { name: "verified", type: "bool" },
      { name: "unclaimed", type: "uint256" },
    ],
  },
  // --- State getters ---
  {
    name: "smartAccounts",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "tipNonce",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "smartAccount", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "artistWallet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "mbidHash", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "isVerified",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "mbidHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "unclaimedBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "mbidHash", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "defaultTipAmount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // --- Events ---
  {
    name: "Joined",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "smartAccount", type: "address", indexed: true },
      { name: "sessionKey", type: "address", indexed: true },
    ],
  },
  {
    name: "Tipped",
    type: "event",
    inputs: [
      { name: "smartAccount", type: "address", indexed: true },
      { name: "mbidHash", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ArtistClaimed",
    type: "event",
    inputs: [
      { name: "mbidHash", type: "bytes32", indexed: true },
      { name: "wallet", type: "address", indexed: true },
    ],
  },
  {
    name: "ArtistVerified",
    type: "event",
    inputs: [
      { name: "mbidHash", type: "bytes32", indexed: true },
      { name: "wallet", type: "address", indexed: true },
    ],
  },
] as const;

// Alias used by onda-rebranded files
export const ONDA_ESCROW_ABI = PATRON_ESCROW_ABI;

export const ERC20_ABI = [
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
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// Validated at startup in next.config.js — safe to cast directly
export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_PATRON_ESCROW_ADDRESS as Address;
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as Address;

// Helpers
export function mbidToBytes32(mbid: string): `0x${string}` {
  return keccak256(toBytes(mbid));
}

export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, 6);
}
