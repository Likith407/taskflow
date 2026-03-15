/** @type {import('next').NextConfig} */
const nextConfig = {
  // No rewrites needed — frontend calls the API URL directly via env var
  // Rewrites only make sense when frontend and API share a domain

  // Strict mode for better React error detection in dev
  reactStrictMode: true,

  // Security headers for the frontend
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
