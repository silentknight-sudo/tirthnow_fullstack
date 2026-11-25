/**
 * Client-only admin panel: `next build` writes static files to `out/`; all data
 * comes from the API. NEXT_PUBLIC_BASE_PATH serves it under a sub-path, e.g.
 * "/tirthnow_fullstack" on GitHub Pages.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
