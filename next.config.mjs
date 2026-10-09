/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;