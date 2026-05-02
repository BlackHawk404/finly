import type { NextConfig } from "next";

const isDesktop = process.env.BUILD_TARGET === "desktop" || process.env.BUILD_TARGET === "mobile";

const nextConfig: NextConfig = {
  // For Electron (DMG) and Capacitor (APK) we generate a fully-static
  // export under /out. For the regular web app this is a no-op.
  output: isDesktop ? "export" : undefined,
  images: {
    unoptimized: isDesktop,
  },
  // Trailing slashes make file:// loading reliable in Electron.
  trailingSlash: isDesktop,
};

export default nextConfig;
