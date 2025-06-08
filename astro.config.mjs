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
  vite: {
    resolve: {
      alias: import.meta.env.PROD
        ? {
            // ① 默认入口
            'react-dom/server': 'react-dom/server.edge',
            // ② 浏览器 fallback —— 也指向 edge 版本
            'react-dom/server.browser': 'react-dom/server.edge',
          }
        : {},
    },
  },
  output: 'server', 
  i18n:{
    defaultLocale:"zh",
    locales:['zh','en']
  },
});