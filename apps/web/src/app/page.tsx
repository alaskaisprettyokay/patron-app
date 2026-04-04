import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero — left-aligned, dense */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16">
        <div className="max-w-xl">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
            Every play sends
            <br />
            a wave.
          </h1>
          <p className="text-ink-light text-lg mb-8 leading-relaxed">
            Spotify sends artists $0.003 per stream.
            <br />
            onda lets you give them $0.01 directly.
          </p>
          <div className="flex gap-3">
            <Link href="/dashboard" className="btn-primary">
              start listening
            </Link>
            <Link href="/claim" className="btn-secondary">
              i'm an artist
            </Link>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="border-y border-rule bg-paper-dark">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="mono-value text-2xl font-bold">$0.01</div>
              <div className="text-sm text-ink-faint mt-0.5">per listen</div>
            </div>
            <div>
              <div className="mono-value text-2xl font-bold">100%</div>
              <div className="text-sm text-ink-faint mt-0.5">to the artist</div>
            </div>
            <div>
              <div className="mono-value text-2xl font-bold">0</div>
              <div className="text-sm text-ink-faint mt-0.5">middlemen</div>
            </div>
            <div>
              <div className="mono-value text-2xl font-bold">USD</div>
              <div className="text-sm text-ink-faint mt-0.5">real dollars</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="section-label mb-8">how it works</div>
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="font-mono text-onda text-sm mb-2">01</div>
            <h3 className="font-semibold mb-1">listen to music</h3>
            <p className="text-ink-light text-sm leading-relaxed">
              Play on Spotify, SoundCloud, Bandcamp, or YouTube Music.
              onda detects what's playing.
            </p>
          </div>
          <div>
            <div className="font-mono text-onda text-sm mb-2">02</div>
            <h3 className="font-semibold mb-1">gifts go out automatically</h3>
            <p className="text-ink-light text-sm leading-relaxed">
              Each track sends a gift from your balance.
              If the artist hasn't claimed yet, it waits for them.
            </p>
          </div>
          <div>
            <div className="font-mono text-onda text-sm mb-2">03</div>
            <h3 className="font-semibold mb-1">artists collect</h3>
            <p className="text-ink-light text-sm leading-relaxed">
              Artists claim their profile, verify their identity, and
              receive gifts directly.
            </p>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="border-t border-rule">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="section-label mb-6">works where you listen</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
            {["Spotify", "SoundCloud", "Bandcamp", "YouTube Music"].map(
              (platform) => (
                <div
                  key={platform}
                  className="border border-rule px-4 py-3 text-sm font-medium hover:border-ink-light transition-colors"
                >
                  {platform}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-rule">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-md">
            <h2 className="text-xl font-bold mb-2">add some funds and onda handles the rest</h2>
            <p className="text-ink-light text-sm mb-6">
              Deposit as little as $5. Every artist you listen to gets something.
            </p>
            <Link href="/dashboard" className="btn-primary">
              get started
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rule py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex justify-between items-center">
          <span className="text-xs text-ink-faint font-mono">
            buena onda
          </span>
          <a
            href="https://github.com/alaskaisprettyokay/patron-app"
            className="text-xs text-ink-faint hover:text-ink transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
