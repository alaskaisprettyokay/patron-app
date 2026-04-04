import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero — left-aligned, dense, statement not sales pitch */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12">
        <div className="max-w-lg">
          <p className="font-mono text-2xs tracking-receipt text-ink-faint mb-6">
            direct music gifts
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08] mb-4">
            Spotify sends artists $0.003
            <br />
            per stream. you can give
            <br />
            them $0.01 directly.
          </h1>
          <p className="text-ink-light text-sm mb-6 leading-relaxed max-w-sm">
            onda detects what you're listening to and sends a gift
            to the artist. no platform, no label, no middleman.
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

      {/* Numbers — receipt-style, dense */}
      <section className="border-y border-rule">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap gap-x-12 gap-y-4 font-mono text-sm">
            <div>
              <span className="text-2xs tracking-receipt text-ink-faint block mb-0.5">per listen</span>
              <span className="font-bold text-lg">$0.01</span>
            </div>
            <div>
              <span className="text-2xs tracking-receipt text-ink-faint block mb-0.5">to artist</span>
              <span className="font-bold text-lg">100%</span>
            </div>
            <div>
              <span className="text-2xs tracking-receipt text-ink-faint block mb-0.5">middlemen</span>
              <span className="font-bold text-lg">0</span>
            </div>
            <div>
              <span className="text-2xs tracking-receipt text-ink-faint block mb-0.5">currency</span>
              <span className="font-bold text-lg">USD</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — tight, informational */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="section-label mb-6">how it works</div>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="font-mono text-onda text-2xs tracking-receipt mb-1.5">01</div>
            <h3 className="font-semibold text-sm mb-1">listen to music</h3>
            <p className="text-ink-light text-xs leading-relaxed">
              Spotify, SoundCloud, Bandcamp, YouTube Music.
              onda detects what's playing.
            </p>
          </div>
          <div>
            <div className="font-mono text-onda text-2xs tracking-receipt mb-1.5">02</div>
            <h3 className="font-semibold text-sm mb-1">gifts go out</h3>
            <p className="text-ink-light text-xs leading-relaxed">
              each track sends a gift from your balance.
              if the artist hasn't claimed yet, it waits.
            </p>
          </div>
          <div>
            <div className="font-mono text-onda text-2xs tracking-receipt mb-1.5">03</div>
            <h3 className="font-semibold text-sm mb-1">artists collect</h3>
            <p className="text-ink-light text-xs leading-relaxed">
              artists verify their identity and receive
              gifts directly. no signup, no email.
            </p>
          </div>
        </div>
      </section>

      {/* Extension preview — the receipt */}
      <section className="border-t border-rule">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="section-label mb-6">what it looks like</div>
          <div className="max-w-[280px] border border-rule bg-paper-dark p-5 font-mono text-xs">
            <div className="font-bold text-sm mb-3 lowercase">onda</div>
            <hr className="receipt-divider" />
            <div className="text-2xs tracking-receipt text-ink-faint mb-2">now listening</div>
            <div className="font-bold text-base mb-0.5">Burial</div>
            <div className="text-ink-light text-xs">Untrue -- "Archangel"</div>
            <div className="mt-3 space-y-1 text-xs text-ink-light">
              <div><span className="text-onda">&#9670;</span> sent $0.01</div>
              <div><span className="text-onda">&#9670;</span> total given: $1.40</div>
              <div><span className="text-onda">&#9670;</span> you are 1 of 47 supporters</div>
            </div>
            <hr className="receipt-divider" />
            <div className="text-2xs tracking-receipt text-ink-faint mb-2">recent</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>Avalon Emerson</span>
                <span className="text-onda">$0.01</span>
              </div>
              <div className="flex justify-between">
                <span>DJ Python</span>
                <span className="text-onda">$0.01</span>
              </div>
              <div className="flex justify-between">
                <span>Laurel Halo</span>
                <span className="text-onda">$0.01</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="border-t border-rule">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="section-label mb-4">works where you listen</div>
          <div className="flex flex-wrap gap-2 max-w-lg">
            {["Spotify", "SoundCloud", "Bandcamp", "YouTube Music"].map(
              (platform) => (
                <div
                  key={platform}
                  className="border border-rule px-3 py-1.5 text-xs font-mono hover:border-ink-light transition-colors"
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="max-w-sm">
            <p className="text-sm mb-4 leading-relaxed">
              add some funds and onda handles the rest.
              every artist you listen to gets something.
            </p>
            <Link href="/dashboard" className="btn-primary">
              get started
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rule py-5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex justify-between items-center">
          <span className="text-2xs text-ink-faint font-mono tracking-receipt">
            buena onda
          </span>
          <a
            href="https://github.com/alaskaisprettyokay/patron-app"
            className="text-2xs text-ink-faint hover:text-ink transition-colors font-mono"
          >
            source
          </a>
        </div>
      </footer>
    </div>
  );
}
