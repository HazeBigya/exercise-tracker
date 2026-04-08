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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('recharts')) {
            return 'charts'
          }

          if (id.includes('framer-motion')) {
            return 'motion'
          }

          if (id.includes('@supabase/supabase-js')) {
            return 'supabase'
          }

          if (id.includes('lucide-react')) {
            return 'icons'
          }

          if (id.includes('react')) {
            return 'react-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
