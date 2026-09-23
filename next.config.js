/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const baseline = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    return [
      ...["/dashboard/:path*", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/:path*", "/b/:path*", "/embed/:path*"].map((source) => ({source, headers:[{key:"X-Robots-Tag",value:"noindex, nofollow"}]})),
      {
        source: "/:path*",
        headers: baseline,
      },
      {
        // Protect application, auth, legal, and dashboard pages from clickjacking.
        // /embed/* is intentionally excluded because customers embed those pages.
        source: "/((?!embed(?:/|$)).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        // The embed route is intentionally frameable by customer websites.
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
