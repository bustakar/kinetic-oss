import { spawnSync } from 'node:child_process'

import { catalogHash, loadCatalog } from './catalog'

const snapshot = loadCatalog()
const command = [
  'exec',
  'convex',
  'run',
  'catalog:publish',
  JSON.stringify({ snapshot, contentHash: catalogHash(snapshot) }),
]
if (process.argv.includes('--prod')) command.push('--prod')

const result = spawnSync('pnpm', command, { stdio: 'inherit' })
process.exit(result.status ?? 1)
