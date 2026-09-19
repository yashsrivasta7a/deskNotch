import { NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  distDir: process.env.NODE_ENV === 'production' ? '../app' : '.next',
  trailingSlash: true, // e.g. home.html => home/index.html
  images: {
    unoptimized: true,
  },
  devIndicators: false,
}

export default config
