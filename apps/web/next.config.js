const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const required = [
  "NEXT_PUBLIC_PATRON_ESCROW_ADDRESS",
  "NEXT_PUBLIC_USDC_ADDRESS",
  "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
];

for (const key of required) {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  if (key.endsWith("_ADDRESS") && !ADDRESS_RE.test(val)) {
    throw new Error(`Invalid address in ${key}: "${val}"`);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    serverComponentsExternalPackages: ['@envio-dev/hypersync-client'],
  },

  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals = [...(config.externals || []), 'pino-pretty', 'lokijs', 'encoding'];
    return config;
  },
};

module.exports = nextConfig;
