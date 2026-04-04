import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const Providers = dynamic(() => import("./providers").then((m) => m.Providers), {
  ssr: false,
});

const ConnectButtonWrapper = dynamic(
  () => import("@/components/ConnectButtonWrapper"),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "onda",
  description:
    "Detect what you're listening to. Send gifts directly to artists.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <nav className="border-b border-rule">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <div className="flex justify-between items-center h-12">
                <a href="/" className="font-mono text-base font-bold">
                  onda
                </a>
                <div className="flex items-center gap-5">
                  <a
                    href="/dashboard"
                    className="text-ink-faint hover:text-ink transition-colors text-xs font-mono"
                  >
                    dashboard
                  </a>
                  <a
                    href="/claim"
                    className="text-ink-faint hover:text-ink transition-colors text-xs font-mono"
                  >
                    claim
                  </a>
                  <ConnectButtonWrapper />
                </div>
              </div>
            </div>
          </nav>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
