import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-patron-950/50 to-gray-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-patron-400 to-accent bg-clip-text text-transparent">
                Every listen
              </span>
              <br />
              pays the artist
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Patron detects what you're listening to and sends micropayments
              directly to artists. No middlemen. Just music and money, flowing
              the right way.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard" className="btn-primary text-lg px-8 py-3">
                Start Listening
              </Link>
              <Link href="/claim" className="btn-secondary text-lg px-8 py-3">
                I'm an Artist
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-patron-600/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-patron-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Listen to music</h3>
            <p className="text-gray-400 text-sm">
              Play music on Spotify, SoundCloud, Bandcamp, or YouTube Music in
              your browser. Our extension detects what's playing.
            </p>
          </div>
          <div className="card text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Auto-tip $0.05</h3>
            <p className="text-gray-400 text-sm">
              Each track triggers a USDC micropayment from your deposited
              balance. If the artist hasn't claimed yet, it's held in escrow.
            </p>
          </div>
          <div className="card text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Artists get paid</h3>
            <p className="text-gray-400 text-sm">
              Artists claim their profile, verify identity, and receive tips
              directly to their wallet. They get an ENS name like
              artist.patron.eth.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-patron-400">$0.05</div>
              <div className="text-sm text-gray-400 mt-1">per listen</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">100%</div>
              <div className="text-sm text-gray-400 mt-1">to the artist</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">0</div>
              <div className="text-sm text-gray-400 mt-1">middlemen</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400">USDC</div>
              <div className="text-sm text-gray-400 mt-1">on Arc L1</div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported platforms */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">
          Works where you listen
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
          Our Chrome extension detects music playing on all major platforms.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
          {["Spotify", "SoundCloud", "Bandcamp", "YouTube Music"].map(
            (platform) => (
              <div
                key={platform}
                className="card text-center py-8 hover:border-gray-700 transition-colors"
              >
                <div className="text-lg font-medium">{platform}</div>
              </div>
            )
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to support artists?</h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">
          Deposit as little as $5 and start auto-tipping every artist you
          listen to. It takes 2 minutes.
        </p>
        <Link href="/dashboard" className="btn-primary text-lg px-8 py-3">
          Get Started
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Built at ETHGlobal Cannes 2025
          </span>
          <div className="flex gap-4 text-sm text-gray-500">
            <a href="https://github.com/alaskaisprettyokay/patron-app" className="hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
