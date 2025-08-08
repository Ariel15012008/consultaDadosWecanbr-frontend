import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
   build: {
    sourcemap: true
  },
  server: {
    https: {
      key: './certs/localhost-key.pem',
      cert: './certs/localhost.pem'
    },
    host: '0.0.0.0',
    port: 5173
  }
})
