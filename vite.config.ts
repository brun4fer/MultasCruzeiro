import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Multas Cruzeiro',
        short_name: 'Multas',
        description: 'Gestão mensal de multas da A.D. Cruzeiro Silvalde',
        theme_color: '#b31921',
        background_color: '#f5f3ef',
        display: 'standalone',
        start_url: '/',
        lang: 'pt-PT',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}']
      }
    })
  ]
})
