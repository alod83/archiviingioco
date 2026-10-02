import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Multipart uploads are inspected before the API route is selected.
    // Keep this above the app's 15 MB document limit to allow form overhead.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
