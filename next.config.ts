import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  rewrites: async () =>
    process.env.NODE_ENV === 'development'
      ? [{ source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' }]
      : [],
}

export default nextConfig
