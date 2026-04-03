import { type Address } from "viem";

export function artistToSubname(artistName: string): string {
  return artistName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatENSName(subname: string): string {
  return `${subname}.patron.eth`;
}

export function formatArtistENS(artistName: string): string {
  return formatENSName(artistToSubname(artistName));
}
