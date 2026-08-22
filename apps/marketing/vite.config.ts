import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

const exercises = JSON.parse(
  readFileSync(new URL('../../data/exercises.json', import.meta.url), 'utf8'),
) as unknown[]
const muscles = JSON.parse(
  readFileSync(new URL('../../data/muscles.json', import.meta.url), 'utf8'),
) as unknown[]

export default defineConfig({
  define: {
    __EXERCISE_COUNT__: exercises.length,
    __MUSCLE_COUNT__: muscles.length,
  },
  plugins: [react()],
})
