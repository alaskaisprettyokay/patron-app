import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-3rem)]">
      {/* Hero — poster / zine feel */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <h1 className="text-display font-bold max-w-md">
          every play
          <br />
          sends a<br />
          <span className="highlight">wave.</span>
        </h1>
      </section>

      {/* One-liner in inverted block */}
      <section className="ink-block">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <p className="font-mono text-sm">
            Spotify sends artists <span className="text-onda">$0.003</span> per stream.
            onda lets you give them <span className="text-onda">$0.01</span> directly.
          </p>
          <Link href="/dashboard" className="font-mono text-xs text-paper border border-paper/30 px-4 py-2 hover:bg-paper hover:text-ink transition-all shrink-0">
            start listening
          </Link>
        </div>
      </section>

      {/* Numbers — big, monospace, impactful */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="big-number">$0.01</div>
            <div className="section-label mt-1">per listen</div>
          </div>
          <div>
            <div className="big-number">100%</div>
            <div className="section-label mt-1">to artist</div>
          </div>
          <div>
            <div className="big-number">0</div>
            <div className="section-label mt-1">middlemen</div>
          </div>
        </div>
      </section>

      <div className="receipt-divider max-w-3xl mx-auto" />

      {/* How it works — dense, numbered */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="font-mono text-headline text-onda font-bold leading-none mb-2">01</div>
            <h3 className="font-bold text-sm mb-1">listen to music</h3>
            <p className="text-ink-light text-xs leading-relaxed">
              Spotify, SoundCloud, Bandcamp, YouTube Music.
              onda detects what's playing.
            </p>
          </div>
          <div>
            <div className="font-mono text-headline text-onda font-bold leading-none mb-2">02</div>
            <h3 className="font-bold text-sm mb-1">gifts go out</h3>
            <p className="text-ink-light text-xs leading-relaxed">
              each track sends a gift from your balance.
              if the artist hasn't claimed yet, it waits.
            </p>
          </div>
          <div>
            <div className="font-mono text-headline text-onda font-bold leading-none mb-2">03</div>
            <h3 className="font-bold text-sm mb-1">artists collect</h3>
            <p className="text-ink-light text-xs leading-relaxed">
              verify identity. receive gifts directly.
              no signup. no email. just money.
            </p>
          </div>
        </div>
      </section>

      <div className="receipt-divider max-w-3xl mx-auto" />

      {/* Extension preview — actual receipt */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <div className="section-label mb-3">what you see</div>
            <p className="text-ink-light text-sm leading-relaxed mb-4 max-w-xs">
              the chrome extension sits in your toolbar.
              open it and you see a receipt of what you've given,
              printing in real time as you listen.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Spotify", "SoundCloud", "Bandcamp", "YouTube Music"].map(
                (p) => (
                  <span key={p} className="text-2xs font-mono border border-rule px-2 py-1">
                    {p}
                  </span>
                )
              )}
            </div>
          </div>
          {/* Mock receipt */}
          <div className="w-[260px] shrink-0 bg-paper-dark border border-rule p-4 font-mono text-xs shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
            <div className="font-bold text-base mb-2">onda</div>
            <div className="receipt-divider !my-2" />
            <div className="section-label mb-1.5">now listening</div>
            <div className="font-bold text-lg leading-tight">Burial</div>
            <div className="text-ink-light text-xs">Untrue -- "Archangel"</div>
            <div className="mt-3 space-y-1 text-xs text-ink-light">
              <div><span className="text-onda font-bold">&#9670;</span> sent $0.01</div>
              <div><span className="text-onda font-bold">&#9670;</span> total given: $1.40</div>
            </div>
            <div className="mt-2 text-2xs text-ink-faint">
              you are 1 of 47 supporters
            </div>
            <div className="receipt-divider !my-2" />
            <div className="space-y-1 text-2xs">
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

      {/* Artist claim CTA — inverted block */}
      <section className="ink-block mt-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="font-bold text-lg mb-0.5">are you an artist?</div>
              <p className="text-paper/60 text-xs font-mono">
                people might already be giving to you. claim your profile.
              </p>
            </div>
            <Link href="/claim" className="font-mono text-xs border border-paper/30 px-5 py-2.5 hover:bg-paper hover:text-ink transition-all shrink-0 text-center">
              claim profile
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <p className="font-mono text-sm text-ink-light mb-4 max-w-sm">
          add some funds and onda handles the rest.
          every artist you listen to gets something.
        </p>
        <Link href="/dashboard" className="btn-primary">
          get started
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-rule py-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex justify-between items-center">
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
