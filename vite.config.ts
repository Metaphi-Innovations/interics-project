import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const dir = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf-8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': resolve(dir, './src'),
    },
  },
  test: {
    environment: 'node',
  },
})
