/** Static marketing site: `next build` writes plain HTML/CSS/JS to `out/`. */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: true,
};

export default nextConfig;
