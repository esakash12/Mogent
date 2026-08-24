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
};

export default nextConfig;
