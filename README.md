# Patron

**Every listen pays the artist.** Patron detects what music you're listening to and sends USDC micropayments directly to artists — no middlemen.

Built at ETHGlobal Cannes 2025.

## How It Works

```
┌─────────────────────────────────┐
│       CHROME EXTENSION          │
│  Detects: artist + track on     │
│  Spotify, SoundCloud, Bandcamp, │
│  YouTube Music                  │
└──────────────┬──────────────────┘
               │ {artist, track}
               ▼
┌─────────────────────────────────┐
│       WEB APP (Next.js)         │
│  /api/lookup → MusicBrainz MBID │
│  /dashboard  → Listener stats   │
│  /claim      → Artist claim flow│
│  Auth: World ID + WalletConnect │
└──────────────┬──────────────────┘
               │ tip(mbidHash, amount)
               ▼
┌─────────────────────────────────┐
│    SMART CONTRACTS (Arc L1)     │
│  PatronEscrow.sol               │
│   - deposit USDC, auto-tip     │
│   - escrow for unclaimed artists│
│  PatronRegistry.sol             │
│   - artist.patron.eth subnames │
│   - MusicBrainz MBID records   │
└─────────────────────────────────┘
```

## User Flows

### Listener (2 min setup)
1. Connect wallet → Verify with World ID → Deposit USDC
2. Install Chrome extension
3. Play music → Extension auto-detects → $0.01 USDC sent per track

### Artist Claim
1. Search for your artist name (MusicBrainz lookup)
2. Add verification code to your Bandcamp/website
3. Claim profile → Get `artist-name.patron.eth`
4. Escrowed tips release to your wallet

## Tech Stack

| Layer | Tech |
|-------|------|
| Web App | Next.js 14, TypeScript, Tailwind CSS |
| Extension | Chrome Manifest V3, content scripts |
| Contracts | Solidity 0.8.20, Foundry |
| Payments | USDC on Arc (Circle L1) + Base Sepolia |
| Identity | World ID 4.0 (proof of human) |
| Names | ENS subnames (artist.patron.eth) |
| Wallet | RainbowKit, WalletConnect, wagmi, viem |
| Data | MusicBrainz API (artist/track/URL lookup) |

## Project Structure

```
patron/
├── apps/
│   ├── web/                    # Next.js web app
│   │   └── src/
│   │       ├── app/            # Pages + API routes
│   │       ├── components/     # React components
│   │       ├── hooks/          # Contract interaction hooks
│   │       └── lib/            # MusicBrainz, contracts, ENS, config
│   └── extension/              # Chrome extension
│       ├── manifest.json       # Manifest V3
│       ├── content/            # Platform content scripts
│       ├── popup/              # Extension popup UI
│       └── background/         # Service worker
├── contracts/                  # Foundry project
│   └── src/
│       ├── PatronEscrow.sol    # Deposits, tips, escrow, claims
│       ├── PatronRegistry.sol  # ENS subname registry
│       └── MockUSDC.sol        # Test token
└── package.json
```

## Smart Contracts

### PatronEscrow.sol
- `deposit(amount)` — Listener deposits USDC
- `tip(mbidHash, amount)` — Send tip to artist (direct if verified, escrow if not)
- `tipDefault(mbidHash)` — Tip using default amount ($0.01)
- `claimArtist(mbidHash)` — Artist claims their profile
- `verifyAndRelease(mbidHash)` — Owner verifies + releases escrowed funds
- `withdraw(amount)` — Listener withdraws unused balance

### PatronRegistry.sol
- `registerArtist(mbidHash, subname, wallet)` — Register ENS subname
- `resolveArtist(mbidHash)` — Look up artist wallet by MBID
- `resolveSubname(subname)` — Look up wallet by ENS subname
- Text records store MusicBrainz MBIDs

## Chrome Extension

Detects currently playing music via DOM selectors on:
- **Spotify** — `open.spotify.com` (data-testid selectors + title fallback)
- **SoundCloud** — `soundcloud.com` (playback badge selectors)
- **Bandcamp** — `*.bandcamp.com` (title link + band name selectors)
- **YouTube Music** — `music.youtube.com` (player bar selectors)

Sends `{artist, track, platform}` to the service worker, which calls `/api/lookup` for MusicBrainz resolution and records tips.

## Development

```bash
# Web app
cd apps/web
npm install
npm run dev        # http://localhost:3000

# Chrome extension
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked" → select apps/extension/

# Contracts
cd contracts
forge build
forge test
```

## Environment Variables

Copy `apps/web/.env.example` to `apps/web/.env.local`:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_WORLD_APP_ID=app_your_app_id
NEXT_PUBLIC_PATRON_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_PATRON_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=5042002
```

## Prize Categories

- **Arc** ($6K) — USDC nanopayments per listen on Arc L1
- **World ID** ($8K) — Proof-of-human for listener verification
- **ENS** ($5K) — artist.patron.eth subname registry
- **Unlink** ($3K) — Private tipping mode on Base Sepolia
- **WalletConnect** ($4K) — WalletConnect Pay for deposits

## License

MIT
