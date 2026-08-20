import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  plugins:
    mode === 'test'
      ? []
      : [tailwindcss(), tanstackStart(), viteReact(), nitro()],
  test: {
    environment: 'node',
  },
}))

export default config
