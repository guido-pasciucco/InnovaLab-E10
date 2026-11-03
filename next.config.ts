import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only DX: the signup error preview is checked at http://127.0.0.1:3203
  // (the URL the team uses for /signup), but Turbopack blocks dev resources
  // (HMR/the RSC payload) from that host by default, which silently skips
  // hydration and leaves the form inert. No effect on production builds.
  allowedDevOrigins: ["127.0.0.1"],
  // The step 8 PDF route renders with @react-pdf/renderer, which loads its
  // fonts and layout engine at runtime: keep it a Node require, not bundled.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
