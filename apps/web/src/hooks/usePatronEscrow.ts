"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  ESCROW_ADDRESS,
  USDC_ADDRESS,
  PATRON_ESCROW_ABI,
  ERC20_ABI,
  formatUSDC,
  parseUSDC,
  mbidToBytes32,
} from "@/lib/contracts";

export function useListenerBalance() {
  const { address } = useAccount();
  const { data, refetch } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "listenerBalance",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    balance: data as bigint | undefined,
    formatted: data ? formatUSDC(data as bigint) : "0.00",
    refetch,
  };
}

export function useTotalTipped() {
  const { address } = useAccount();
  const { data } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "totalTipped",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    total: data as bigint | undefined,
    formatted: data ? formatUSDC(data as bigint) : "0.00",
  };
}

export function useArtistInfo(mbid: string) {
  const mbidHash = mbidToBytes32(mbid);
  const { data, refetch } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "getArtistInfo",
    args: [mbidHash],
  });

  const result = data as [string, boolean, bigint] | undefined;

  return {
    wallet: result?.[0],
    verified: result?.[1] ?? false,
    unclaimed: result?.[2] ?? 0n,
    unclaimedFormatted: result ? formatUSDC(result[2]) : "0.00",
    isClaimed: result ? result[0] !== "0x0000000000000000000000000000000000000000" : false,
    refetch,
  };
}

export function useDeposit() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (amount: string) => {
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ESCROW_ADDRESS, parseUSDC(amount)],
    });
  };

  const deposit = (amount: string) => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: PATRON_ESCROW_ABI,
      functionName: "deposit",
      args: [parseUSDC(amount)],
    });
  };

  return { approve, deposit, isPending, isConfirming, isSuccess };
}

export function useTip() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const tip = (mbid: string, amount?: string) => {
    const mbidHash = mbidToBytes32(mbid);
    if (amount) {
      writeContract({
        address: ESCROW_ADDRESS,
        abi: PATRON_ESCROW_ABI,
        functionName: "tip",
        args: [mbidHash, parseUSDC(amount)],
      });
    } else {
      writeContract({
        address: ESCROW_ADDRESS,
        abi: PATRON_ESCROW_ABI,
        functionName: "tipDefault",
        args: [mbidHash],
      });
    }
  };

  return { tip, isPending, isConfirming, isSuccess };
}

export function useClaimArtist() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = (mbid: string) => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: PATRON_ESCROW_ABI,
      functionName: "claimArtist",
      args: [mbidToBytes32(mbid)],
    });
  };

  return { claim, isPending, isConfirming, isSuccess };
}
