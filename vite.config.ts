import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // VITE_BASE is injected by CI for GitHub Pages subpath (e.g. /ChorPoliceDaktarBabu/).
  // Falls back to '/' for local dev.
  base: process.env.VITE_BASE ?? '/',
})
