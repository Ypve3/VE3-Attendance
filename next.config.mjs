/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["pg"],
  },
  webpack: (config) => {
    config.ignoreWarnings = [{ module: /@vladmandic\/face-api/ }];
    return config;
  },
};
export default nextConfig;
