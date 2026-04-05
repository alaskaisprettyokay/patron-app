import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 pt-20 pb-16">
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[0.95] mb-6 max-w-lg">
          every play
          <br />
          sends a
          <br />
          <span className="text-onda">wave.</span>
        </h1>
        <p className="text-ink-light text-lg max-w-md mb-8 leading-snug">
          Spotify sends artists $0.003 per stream.
          onda lets you give them $0.01 directly.
        </p>
        <div className="flex gap-3 flex-wrap">
          <a href="/onda.zip" download className="btn-primary">
            download extension
          </a>
          <Link href="/claim" className="btn-secondary">
            i'm an artist
          </Link>
        </div>
      </section>

      {/* Numbers — big monospace in inverted bar */}
      <section className="ink-block">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="font-mono text-3xl sm:text-4xl font-bold tracking-tight">$0.01</div>
              <div className="text-sm text-paper/50 mt-1">per listen</div>
            </div>
            <div>
              <div className="font-mono text-3xl sm:text-4xl font-bold tracking-tight">100%</div>
              <div className="text-sm text-paper/50 mt-1">to the artist</div>
            </div>
            <div>
              <div className="font-mono text-3xl sm:text-4xl font-bold tracking-tight">0</div>
              <div className="text-sm text-paper/50 mt-1">middlemen</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-16">
        <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-10">How it works</h2>
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="text-5xl font-bold text-onda/20 leading-none mb-3">01</div>
            <h3 className="text-lg font-bold mb-2">listen to music</h3>
            <p className="text-ink-light text-sm leading-relaxed">
              Spotify, SoundCloud, Bandcamp, YouTube Music.
              onda detects what's playing.
            </p>
          </div>
          <div>
            <div className="text-5xl font-bold text-onda/20 leading-none mb-3">02</div>
            <h3 className="text-lg font-bold mb-2">gifts go out</h3>
            <p className="text-ink-light text-sm leading-relaxed">
              each track sends a gift from your balance.
              if the artist hasn't claimed yet, it waits for them.
            </p>
          </div>
          <div>
            <div className="text-5xl font-bold text-onda/20 leading-none mb-3">03</div>
            <h3 className="text-lg font-bold mb-2">artists collect</h3>
            <p className="text-ink-light text-sm leading-relaxed">
              verify identity. receive gifts directly.
              no signup. no email. just money.
            </p>
          </div>
        </div>
      </section>

      {/* Extension preview + platforms */}
      <section className="border-t border-rule">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-16">
          <div className="flex flex-col md:flex-row gap-12 items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-3">the extension sits in your toolbar</h2>
              <p className="text-ink-light text-sm leading-relaxed mb-6 max-w-sm">
                it watches what you listen to and sends a gift to every artist.
                you don't have to do anything. just listen.
              </p>
              <a href="/onda.zip" download className="btn-primary inline-block mb-5">
                download extension
              </a>
              <div className="flex flex-wrap gap-2">
                {["Spotify", "SoundCloud", "Bandcamp", "YouTube Music"].map((p) => (
                  <span key={p} className="text-xs border border-rule px-3 py-1.5 hover:border-ink transition-colors">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            {/* Mini popup mock */}
            <div className="w-[240px] shrink-0 border border-rule bg-paper-dark shadow-[6px_6px_0_0_rgba(21,19,17,0.06)]">
              <div className="bg-ink text-paper px-4 py-2.5 flex justify-between items-baseline">
                <span className="font-bold text-sm">onda</span>
                <span className="text-onda text-xs font-mono">$1.40</span>
              </div>
              <div className="p-4">
                <div className="text-xs text-ink-faint uppercase tracking-widest mb-2">now listening</div>
                <div className="font-bold text-lg leading-tight">Burial</div>
                <div className="text-ink-light text-sm">Untrue -- "Archangel"</div>
                <div className="mt-3 border-t border-rule pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-light">sent</span>
                    <span className="text-onda font-bold">$0.01</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-light">total to Burial</span>
                    <span className="font-mono">$1.40</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-light">supporters</span>
                    <span className="font-mono">47</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Artist CTA */}
      <section className="ink-block">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">are you an artist?</h2>
            <p className="text-paper/60 text-sm">
              people might already be giving to you. claim your profile.
            </p>
          </div>
          <Link href="/claim" className="border border-paper/30 px-6 py-3 text-sm hover:bg-paper hover:text-ink transition-all text-center shrink-0">
            claim profile
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-16">
        <p className="text-ink-light text-lg mb-5 max-w-md leading-snug">
          add some funds and onda handles the rest.
          every artist you listen to gets something.
        </p>
        <div className="flex gap-3">
          <a href="/onda.zip" download className="btn-primary">
            download extension
          </a>
          <Link href="/dashboard" className="btn-secondary">
            get started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rule py-5">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 flex justify-between items-center">
          <span className="text-xs text-ink-faint">buena onda</span>
          <a
            href="https://github.com/alaskaisprettyokay/patron-app"
            className="text-xs text-ink-faint hover:text-ink transition-colors"
          >
            source
          </a>
        </div>
      </footer>
    </div>
  );
}
