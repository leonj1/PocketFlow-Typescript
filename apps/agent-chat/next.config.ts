import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.162"],
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  turbopack: { root: path.resolve(__dirname, "../..") },
};

export default nextConfig;
