/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'query-baton-alarm.ngrok-free.dev',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
  ],
  images: {
    localPatterns: [
      {
        pathname: "/api/product/**/image",
      },
    ],
  },
};

export default nextConfig;
