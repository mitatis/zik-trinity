#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { constants } from 'node:fs'
import { access, cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const contentDir = resolve(root, process.env.CONTENT_DIR || '.content')
const repoUrl =
  process.env.CONTENT_REPO_URL || 'https://github.com/mitatis/zik-trinity-content.git'
const contentRef = process.env.CONTENT_REF || 'main'
const fresh = process.argv.includes('--fresh') || process.env.CONTENT_FRESH === '1'
const collections = ['blog', 'poetry']

const exists = async (path) => {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

if (fresh && (await exists(contentDir))) {
  await rm(contentDir, { recursive: true, force: true })
}

if (!(await exists(join(contentDir, '.git')))) {
  await rm(contentDir, { recursive: true, force: true })
  run('git', ['clone', '--depth=1', '--branch', contentRef, repoUrl, contentDir])
} else {
  run('git', ['fetch', '--depth=1', 'origin', contentRef], contentDir)
  run('git', ['checkout', '--force', 'FETCH_HEAD'], contentDir)
  run('git', ['clean', '-fdx'], contentDir)
}

for (const collection of collections) {
  const source = join(contentDir, collection)
  const target = join(root, 'src/content', collection)

  if (!(await exists(source))) {
    await rm(target, { recursive: true, force: true })
    await mkdir(target, { recursive: true })
    console.warn(`[content] ${collection}/ not found in content repository; created empty collection`)
    continue
  }

  await rm(target, { recursive: true, force: true })
  await mkdir(dirname(target), { recursive: true })
  await cp(source, target, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
  })
  console.log(`[content] synced ${collection}/`)
}

await rm(join(root, '.astro'), { recursive: true, force: true })
await rm(join(root, 'node_modules', '.astro'), { recursive: true, force: true })
console.log('[content] cleared Astro content cache')
