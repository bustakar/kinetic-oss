import { spawnSync } from 'node:child_process'

const root = new URL('../', import.meta.url)
if (process.argv.length > 2) throw new Error('Usage: pnpm catalog:publish')

runGit(['diff', '--quiet', '--', 'data'])
runGit(['diff', '--cached', '--quiet', '--', 'data'])

const commit = runGit(['rev-parse', 'HEAD'], true)
const convexArgs = [
  '--dir',
  'packages/convex',
  'exec',
  'convex',
  'run',
  'catalog:publish',
  JSON.stringify({ commit }),
]

const result = spawnSync('pnpm', convexArgs, {
  cwd: root,
  stdio: 'inherit',
})
if (result.error !== undefined) throw result.error
process.exitCode = result.status ?? 1

function runGit(args, capture = false) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: capture ? 'utf8' : undefined,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    if (args[0] === 'diff') {
      throw new Error('Commit catalog changes before publishing')
    }
    throw new Error(`git ${args.join(' ')} failed`)
  }
  return capture ? result.stdout.trim() : undefined
}
