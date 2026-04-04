// Seed a 0.10 USDC tip for a dummy artist then claim their onda.eth subname.
// Uses ethers directly — no Foundry simulation, transactions go straight to chain.
//
// Usage:
//   node contracts/scripts/claimSubname.mjs
//
// Required env vars:
//   DEPLOYER_KEY            — funded Arc wallet
//   PATRON_ESCROW_ADDRESS   — PatronEscrow on Arc
//   ONDA_REGISTRAR_ADDRESS  — OndaRegistrar on Arc
//
// Optional:
//   SUBNAME_LABEL  (default: "root")
//   ARTIST_MBID    (default: dummy UUID)

import { ethers } from "ethers";

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL = "https://rpc.testnet.arc.network";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const TIP_AMOUNT = 100_000n; // 0.10 USDC (6 decimals)

const DEPLOYER_KEY = process.env.DEPLOYER_KEY;
const ESCROW_ADDRESS = process.env.PATRON_ESCROW_ADDRESS;
const REGISTRAR_ADDRESS = process.env.ONDA_REGISTRAR_ADDRESS;
const LABEL = process.env.SUBNAME_LABEL ?? "root";
const MBID = process.env.ARTIST_MBID ?? "00000000-0000-0000-0000-000000000000";

if (!DEPLOYER_KEY || !ESCROW_ADDRESS || !REGISTRAR_ADDRESS) {
  console.error("Missing env vars: DEPLOYER_KEY, PATRON_ESCROW_ADDRESS, ONDA_REGISTRAR_ADDRESS");
  process.exit(1);
}

// ── ABIs ──────────────────────────────────────────────────────────────────────

const USDC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

const ESCROW_ABI = [
  "function join(address sessionKey) returns (address smartAccount)",
  "function smartAccounts(address owner) view returns (address)",
  "function tipNonce(address smartAccount) view returns (uint256)",
  "function tipWithSignature(address smartAccount, bytes32 mbidHash, uint256 amount, uint256 nonce, bytes calldata signature) external",
];

const REGISTRAR_ABI = [
  "function register(string calldata label, string calldata mbid) external",
];

// ── Main ──────────────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL);
const deployer = new ethers.Wallet(DEPLOYER_KEY, provider);

// Derive a deterministic session key so the script is self-contained.
const sessionPrivKey = ethers.keccak256(
  ethers.solidityPacked(["bytes32", "string"], [DEPLOYER_KEY, "onda-session"])
);
const sessionWallet = new ethers.Wallet(sessionPrivKey, provider);

const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, deployer);
const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, deployer);
const registrar = new ethers.Contract(REGISTRAR_ADDRESS, REGISTRAR_ABI, deployer);

const mbidHash = ethers.keccak256(ethers.toUtf8Bytes(MBID));

console.log("Deployer :", deployer.address);
console.log("Session  :", sessionWallet.address);
console.log("mbidHash :", mbidHash);
console.log("Claiming :", `${LABEL}.onda.eth`);
console.log();

// 1. Join — links deployer wallet to a PatronSmartAccount with our session key.
console.log("1. Joining escrow...");
const joinTx = await escrow.join(sessionWallet.address);
const joinReceipt = await joinTx.wait();
console.log("   tx:", joinReceipt.hash);

const smartAccount = await escrow.smartAccounts(deployer.address);
console.log("   SmartAccount:", smartAccount);

// 2. Fund the smart account with 0.10 USDC.
console.log("2. Funding smart account...");
const fundTx = await usdc.transfer(smartAccount, TIP_AMOUNT);
const fundReceipt = await fundTx.wait();
console.log("   tx:", fundReceipt.hash);

// 3. Sign the tip payload.
//    Contract verifies: ECDSA.recover(toEthSignedMessageHash(hash), sig) == sessionKey
//    ethers.Wallet.signMessage() applies the EIP-191 prefix automatically.
const nonce = await escrow.tipNonce(smartAccount);
const hash = ethers.solidityPackedKeccak256(
  ["address", "bytes32", "uint256", "uint256"],
  [smartAccount, mbidHash, TIP_AMOUNT, nonce]
);
const signature = await sessionWallet.signMessage(ethers.getBytes(hash));

// 4. Submit the tip.
console.log("3. Submitting tip...");
const tipTx = await escrow.tipWithSignature(smartAccount, mbidHash, TIP_AMOUNT, nonce, signature);
const tipReceipt = await tipTx.wait();
console.log("   tx:", tipReceipt.hash);
console.log("   0.10 USDC escrowed for", MBID);

// 5. Claim the subname.
console.log("4. Claiming subname...");
const claimTx = await registrar.register(LABEL, MBID);
const claimReceipt = await claimTx.wait();
console.log("   tx:", claimReceipt.hash);
console.log();
console.log(`✓ ${LABEL}.onda.eth claimed by ${deployer.address}`);
