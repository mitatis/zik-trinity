import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react'; // Add this line
import cloudflare from '@astrojs/cloudflare';

// Determine site URL based on environment
const getSiteURL = () => {
  // For Vercel production deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // For Vercel preview deployment
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  // For local development
  return 'http://localhost:4321';
};

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({ mode: 'advanced' }),

  site: getSiteURL(),
  integrations: [
    tailwind(),
    react(),
  ],
  output: 'server', 
  i18n:{
    defaultLocale:"zh",
    locales:['zh','en']
  },
  vite: {
    // Đảm bảo biến môi trường được chuyển đến client
    define: {
      'import.meta.env.SPOTIFY_CLIENT_ID': JSON.stringify(process.env.SPOTIFY_CLIENT_ID),
      'import.meta.env.SPOTIFY_CLIENT_SECRET': JSON.stringify(process.env.SPOTIFY_CLIENT_SECRET),
      'import.meta.env.SPOTIFY_REFRESH_TOKEN': JSON.stringify(process.env.SPOTIFY_REFRESH_TOKEN),
    },
  },
});