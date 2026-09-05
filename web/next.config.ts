const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4008';
const backendHost = new URL(backendUrl).hostname;
const backendPort = new URL(backendUrl).port;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: backendHost,
        port: backendPort,
      },
      {
        protocol: 'https',
        hostname: backendHost,
        port: backendPort,
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
};

export default nextConfig;
