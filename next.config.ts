import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only DX: the signup error preview is checked at http://127.0.0.1:3203
  // (the URL the team uses for /signup), but Turbopack blocks dev resources
  // (HMR/the RSC payload) from that host by default, which silently skips
  // hydration and leaves the form inert. No effect on production builds.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
