/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'balloon.remax-cca.com',
      },
      {
        protocol: 'https',
        hostname: 'remaxcaribbeanandcentralamerica.azureedge.net',
      },
      {
        protocol: 'https',
        hostname: 'remax-cds.com',
      }
    ],
  },
};

export default nextConfig;
