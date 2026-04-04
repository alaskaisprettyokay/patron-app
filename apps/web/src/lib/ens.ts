export function artistToSubname(artistName: string): string {
  return artistName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatENSName(subname: string): string {
  return `${subname}.onda.eth`;
}
