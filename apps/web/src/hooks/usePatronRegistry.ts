"use client";

import { useReadContract } from "wagmi";
import { REGISTRY_ADDRESS, PATRON_REGISTRY_ABI } from "@/lib/contracts";
import { mbidToBytes32 } from "@/lib/contracts";
import { formatENSName } from "@/lib/ens";

export function useArtistSubname(mbid: string) {
  const mbidHash = mbidToBytes32(mbid);
  const { data } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: PATRON_REGISTRY_ABI,
    functionName: "artistSubname",
    args: [mbidHash],
  });

  const subname = data as string | undefined;

  return {
    subname: subname || null,
    ensName: subname ? formatENSName(subname) : null,
  };
}

export function useResolveArtist(mbid: string) {
  const mbidHash = mbidToBytes32(mbid);
  const { data } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: PATRON_REGISTRY_ABI,
    functionName: "resolveArtist",
    args: [mbidHash],
  });

  return {
    address: data as string | undefined,
  };
}

export function useResolveSubname(subname: string) {
  const { data } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: PATRON_REGISTRY_ABI,
    functionName: "resolveSubname",
    args: [subname],
    query: { enabled: !!subname },
  });

  return {
    address: data as string | undefined,
  };
}

export function useArtistTextRecord(mbid: string, key: string) {
  const mbidHash = mbidToBytes32(mbid);
  const { data } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: PATRON_REGISTRY_ABI,
    functionName: "getTextRecord",
    args: [mbidHash, key],
  });

  return {
    value: data as string | undefined,
  };
}
