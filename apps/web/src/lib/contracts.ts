import { type Address, formatUnits, keccak256, toBytes } from "viem";

// Contract ABIs (simplified for key functions)
export const ONDA_ESCROW_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "tip",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "mbidHash", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "tipDefault",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "mbidHash", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "claimArtist",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "mbidHash", type: "bytes32" }],
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
    name: "totalTipped",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "unclaimedBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
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
  {
    name: "defaultTipAmount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isVerified",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "artistWallet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "verifyAndRelease",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "mbidHash", type: "bytes32" }],
    outputs: [],
  },
] as const;

export const ONDA_REGISTRY_ABI = [
  {
    name: "registerArtist",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "mbidHash", type: "bytes32" },
      { name: "subname", type: "string" },
      { name: "wallet", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "resolveArtist",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "mbidHash", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "resolveSubname",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "subname", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "artistSubname",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "getTextRecord",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "mbidHash", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

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

// Contract addresses (from env)
export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_PATRON_ESCROW_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;
export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_PATRON_REGISTRY_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;

// Helpers
export function mbidToBytes32(mbid: string): `0x${string}` {
  return keccak256(toBytes(mbid));
}

export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, 6);
}
