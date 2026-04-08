import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    Sitemap({
      hostname: 'https://exercise-tracker.bigya.com.np',
      generateRobotsTxt: true,
      readable: true,
      changefreq: 'daily',
      priority: 1,
      robots: [{ userAgent: '*', allow: '/' }],
    }),
  ],
})
