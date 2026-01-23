/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs-chainsafe.dev',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
        {
          source: '/api/proxy/:path*',
          destination: 'https://dev.pumpfunclone2025.win/:path*',
        },
      // {
      //   source: '/api/proxy/:path*',
      //   destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`,
      // },
      {
        source: '/robots.txt',
        destination: '/api/robots',
      },
    ];
  },
};

export default nextConfig;
