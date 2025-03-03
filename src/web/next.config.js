const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/**
 * Creates the security headers configuration for the Next.js application
 * @returns {Array} Array of header configurations for different routes
 */
const createSecurityHeaders = () => {
  return [
    {
      // Apply these headers to all routes
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          // Content Security Policy
          key: 'Content-Security-Policy',
          value: `
            default-src 'self';
            script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.vercel-analytics.com https://*.vercel-insights.com https://*.stripe.com;
            style-src 'self' 'unsafe-inline';
            img-src 'self' blob: data: https://*.supabase.co https://*.youtube.com https://*.ytimg.com https://*.vimeo.com https://*.instagram.com https://*.cdninstagram.com https://*.twimg.com https://*.tiktokcdn.com https://*.fbcdn.net https://*.linkedin.com https://*.stripe.com;
            media-src 'self' https://*.youtube.com https://*.vimeo.com https://*.instagram.com https://*.tiktok.com;
            connect-src 'self' https://*.supabase.co https://*.vercel-analytics.com https://*.vercel-insights.com https://*.stripe.com https://*.deepseek.com https://*.huggingface.co https://*.resend.dev;
            font-src 'self' data:;
            frame-src 'self' https://*.youtube.com https://*.vimeo.com https://*.instagram.com https://*.tiktok.com https://*.twitter.com https://*.linkedin.com https://*.stripe.com;
            object-src 'none';
            base-uri 'self';
            form-action 'self';
            frame-ancestors 'self';
            block-all-mixed-content;
            upgrade-insecure-requests;
          `.replace(/\s{2,}/g, ' ').trim(),
        },
        {
          // Permissions Policy to limit browser features
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), autoplay=self',
        },
        {
          // Strict Transport Security
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ],
    },
  ];
};

// Base Next.js configuration
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization configuration
  images: {
    domains: [
      // Social media platforms
      'youtube.com',
      'ytimg.com',
      'i.ytimg.com',
      'instagram.com',
      'cdninstagram.com',
      'twimg.com',
      'twitter.com',
      'pbs.twimg.com',
      'tiktokcdn.com',
      'tiktok.com',
      'p16-sign.tiktokcdn-us.com',
      'fbcdn.net',
      'facebook.com',
      'vimeo.com',
      'i.vimeocdn.com',
      'linkedin.com',
      'media.licdn.com',
      // Storage services
      'supabase.co',
      'supabase.in',
      // Engagerr's own storage
      'engagerr-storage.s3.amazonaws.com',
      'engagerr-public.vercel.app',
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600, // Cache optimized images for at least 1 hour
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true, // Allow SVG images for creator logos and brand assets
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Security headers
  headers: createSecurityHeaders,
  
  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'engagerr.com', '*.engagerr.com'],
    },
    serverComponentsExternalPackages: ['sharp', 'prisma', '@prisma/client'],
    optimizeCss: true, // Enable CSS optimization
    scrollRestoration: true, // Enable scroll restoration for better UX
  },
  
  // Webpack configuration for special cases
  webpack: (config, { isServer }) => {
    // Support for SVGR
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });
    
    // Optimization for AI model integrations
    if (isServer) {
      // Externalize large packages to improve build time
      config.externals = [...config.externals, 'canvas', 'jsdom'];
    }
    
    return config;
  },
  
  // Redirects for legacy paths if needed
  async redirects() {
    return [
      // If we need to redirect legacy URLs in the future
    ];
  },
  
  // Custom environment variables to expose to the browser
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },
  
  // Configure output standalone mode for improved containerization
  output: 'standalone',
  
  // Configure poweredByHeader to hide Express.js info
  poweredByHeader: false,
};

// Export the configuration with bundle analyzer wrapper
module.exports = withBundleAnalyzer(nextConfig);