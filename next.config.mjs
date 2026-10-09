/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.mybigcommerce.com",
      },
      {
        protocol: "https",
        hostname: "**.curednutrition.com",
      },
    ],
  },
};

export default nextConfig;