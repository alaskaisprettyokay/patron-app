/**
 * Mock data for the landing page.
 *
 * TODO: swap each section for real data from the API / CMS / DB.
 * Marked with `// TODO:` comments where the swap points are.
 */

// TODO: swap for real platforms the extension currently supports
export const PLATFORMS = [
  {
    id: "spotify",
    name: "spotify",
    chrome: "#121212",
    fg: "#ffffff",
    accent: "#1DB954",
    track: { title: "parliaments knell", artist: "loraine james", album: "reflection", art: "#3A4A6B" },
  },
  {
    id: "soundcloud",
    name: "soundcloud",
    chrome: "#F2F2F2",
    fg: "#1a1a1a",
    accent: "#FF5500",
    track: { title: "zone 1 to 6000", artist: "iglooghost", album: "lei line eon", art: "#D4B343" },
  },
  {
    id: "bandcamp",
    name: "bandcamp",
    chrome: "#408EA3",
    fg: "#ffffff",
    accent: "#619AAF",
    track: { title: "fountain", artist: "claire rousay", album: "sentiment", art: "#BF7A52" },
  },
  {
    id: "ytmusic",
    name: "youtube music",
    chrome: "#030303",
    fg: "#ffffff",
    accent: "#FF0033",
    track: { title: "pool & i", artist: "astrid sonne", album: "great doubt", art: "#5E6B4A" },
  },
  {
    id: "radio",
    name: "online radio",
    chrome: "#1A1A1A",
    fg: "#F2EAD3",
    accent: "#F2EAD3",
    track: { title: "live on air", artist: "community station", album: "streaming worldwide", art: "#8B2D2D" },
  },
] as const;

// TODO: swap for top artists by last 30d gift volume
export const FEATURED_ARTISTS = [
  {
    name: "loraine james",
    tag: "experimental electronic",
    loc: "london, uk",
    earned: "$482.17",
    plays: "48,217",
    art: "linear-gradient(135deg, #2A3A5B 0%, #6B4A8C 50%, #D97B4A 100%)",
    artNote: "glitched club topography",
    handles: [{ p: "IG", h: "@loraine.james" }, { p: "BC", h: "loraine-james" }],
    quote: "every play lands. even the weird ones.",
  },
  {
    name: "claire rousay",
    tag: "emo ambient / field recording",
    loc: "san antonio, tx",
    earned: "$311.08",
    plays: "31,108",
    art: "repeating-linear-gradient(0deg, #D8CFB8 0 8px, #BFB7A0 8px 9px), radial-gradient(circle at 30% 40%, #A67550, transparent 50%)",
    artNote: "voicemail + reed organ",
    handles: [{ p: "IG", h: "@clairerousay" }, { p: "BC", h: "clairerousay" }],
    quote: "somebody tipped me for a 42-minute piece. thank you.",
  },
  {
    name: "iglooghost",
    tag: "sound collage / fantasy bass",
    loc: "bristol, uk",
    earned: "$729.44",
    plays: "72,944",
    art: "conic-gradient(from 45deg at 60% 40%, #E8C044, #FF6B35, #2B2D42, #E8C044)",
    artNote: "lei line cartography, vol ii",
    handles: [{ p: "IG", h: "@iglooghost" }, { p: "SC", h: "iglooghost" }],
    quote: "pennies from strangers. love that for me.",
  },
  {
    name: "astrid sonne",
    tag: "viola / song-form minimalism",
    loc: "copenhagen, dk",
    earned: "$256.90",
    plays: "25,690",
    art: "linear-gradient(180deg, #8FA67A 0%, #4A5A3E 60%, #2B2D23 100%)",
    artNote: "great doubt, b-side sketches",
    handles: [{ p: "IG", h: "@astridsonne" }, { p: "BC", h: "astridsonne" }],
    quote: "better than my last publishing statement.",
  },
] as const;

// TODO: swap for live data from the gift feed
export const LIVE_TICKER_SEED = [
  { id: 1, listener: "em", artist: "loraine james", track: "afterglow", platform: "spotify", amt: 0.01 },
  { id: 2, listener: "theo", artist: "claire rousay", track: "fountain", platform: "bandcamp", amt: 0.01 },
  { id: 3, listener: "sasha", artist: "iglooghost", track: "zone 6", platform: "soundcloud", amt: 0.01 },
  { id: 4, listener: "noor", artist: "astrid sonne", track: "pool & i", platform: "yt music", amt: 0.01 },
  { id: 5, listener: "jules", artist: "ana roxanne", track: "venus", platform: "spotify", amt: 0.01 },
  { id: 6, listener: "ren", artist: "space afrika", track: "bê", platform: "bandcamp", amt: 0.01 },
];

export const LIVE_TICKER_LISTENERS = ["em", "theo", "sasha", "noor", "jules", "ren", "mika", "kai", "ida", "leo", "sun", "ava"];
export const LIVE_TICKER_ARTISTS = ["loraine james", "claire rousay", "iglooghost", "astrid sonne", "ana roxanne", "space afrika", "m. sage", "kara-lis coverdale", "upsammy", "perila"];
export const LIVE_TICKER_TRACKS = ["afterglow", "cotton", "zone 6", "bloom", "slow tide", "low field", "second night", "halo", "still life"];
export const LIVE_TICKER_PLATFORMS = ["spotify", "bandcamp", "soundcloud", "yt music"];

export const FAQ_ITEMS = [
  { q: "can i pay artists more than a cent?", a: "yes — onda has a direct tip button ($1, $5, $20, custom) and an artist-run storefront for merch, vinyl, zines, sample packs. artists set the prices and fulfill orders themselves. you pay them directly. no cut." },
  { q: "how much does onda cost?", a: "the extension is free. you choose how much to allocate per play — the default is one cent. no subscription, no platform fee." },
  { q: "does the artist need an account?", a: "no. tips accrue against the artist's name until they verify and claim. unclaimed gifts wait indefinitely — some artists have years of waves waiting for them." },
  { q: "how do artists get paid?", a: "in dollars. we handle the plumbing. artists can withdraw to their bank, or keep a running balance on onda." },
  { q: "how does detection work?", a: "the extension reads the currently-playing track from the tab's media session api. it never sees anything else on the page." },
  { q: "can labels take a cut?", a: "not through onda. 100% of what you send goes to the verified artist — no exceptions." },
  { q: "what if i don't have a balance?", a: "top up with a card in 30 seconds. minimum is $3. stop any time." },
];
