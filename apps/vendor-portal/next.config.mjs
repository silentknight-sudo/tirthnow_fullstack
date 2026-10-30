/** Client-only portal: `next build` writes static files to `out/`; all data comes from the API. */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: true,
  transpilePackages: ['@tirth-now/api-client'],
};

export default nextConfig;
