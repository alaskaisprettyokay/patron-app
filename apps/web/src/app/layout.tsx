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
            <div className="max-w-4xl mx-auto px-5 sm:px-8">
              <div className="flex justify-between items-center h-14">
                <a href="/" className="text-lg font-bold tracking-tight">
                  onda
                </a>
                <div className="flex items-center gap-6">
                  <a href="/dashboard" className="text-ink-light hover:text-ink transition-colors text-sm">
                    dashboard
                  </a>
                  <a href="/claim" className="text-ink-light hover:text-ink transition-colors text-sm">
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
