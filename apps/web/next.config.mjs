/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@mogent/database", "@mogent/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || "http://207.148.124.171";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
