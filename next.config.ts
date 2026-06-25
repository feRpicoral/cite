import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = (() => {
  if (!supabaseUrl) return null;
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return null;
  }
})();

const supabaseHttpOrigin = supabaseHost ? `https://${supabaseHost}` : "https://*.supabase.co";
const supabaseWsOrigin = supabaseHost ? `wss://${supabaseHost}` : "wss://*.supabase.co";

// 'unsafe-inline' on script-src: Next's bootstrap and next-themes inject inline
// scripts without a nonce here. Tightening to a nonce-based policy needs the
// app wired through middleware, which is out of scope for this header set.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseHttpOrigin}`,
  "font-src 'self'",
  `connect-src 'self' ${supabaseHttpOrigin} ${supabaseWsOrigin}`,
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "mammoth", "@anthropic-ai/sdk"],
  images: {
    remotePatterns: [
      supabaseHost
        ? {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/**",
          }
        : // No project ref at build time: keep the storage-path constraint and
          // accept any supabase.co host rather than blocking image rendering.
          {
            protocol: "https",
            hostname: "*.supabase.co",
            pathname: "/storage/v1/object/**",
          },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=15552000; includeSubDomains",
          },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
