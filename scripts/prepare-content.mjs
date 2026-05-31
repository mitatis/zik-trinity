#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { constants } from 'node:fs'
import { access, cp, mkdir, rm } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const contentDir = resolve(root, process.env.CONTENT_DIR || '.content')
const localSourceDir = process.env.CONTENT_SOURCE_DIR
  ? resolve(root, process.env.CONTENT_SOURCE_DIR)
  : null
const repoUrl =
  process.env.CONTENT_REPO_URL || 'https://github.com/mitatis/zik-trinity-content.git'
const contentRef = process.env.CONTENT_REF || 'main'
const fresh = process.argv.includes('--fresh') || process.env.CONTENT_FRESH === '1'
const clean = process.argv.includes('--clean')
const collections = ['blog', 'poetry', 'journal']
const generatedAssetsDir = join(root, 'public', 'content-assets')

const assertInsideRoot = (path, label) => {
  const rel = relative(root, path)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`${label} must be inside the site repository: ${path}`)
  }
}

assertInsideRoot(contentDir, 'CONTENT_DIR')

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

const clearGeneratedContent = async () => {
  for (const collection of collections) {
    await rm(join(root, 'src/content', collection), { recursive: true, force: true })
  }

  await rm(contentDir, { recursive: true, force: true })
  await rm(generatedAssetsDir, { recursive: true, force: true })
  await rm(join(root, '.astro'), { recursive: true, force: true })
  await rm(join(root, 'node_modules', '.astro'), { recursive: true, force: true })
}

if (clean) {
  await clearGeneratedContent()
  console.log('[content] removed local synced content copies')
} else {
  let sourceRoot = contentDir

  if (localSourceDir) {
    if (!(await exists(localSourceDir))) {
      throw new Error(`CONTENT_SOURCE_DIR does not exist: ${localSourceDir}`)
    }
    sourceRoot = localSourceDir
    console.log(`[content] using local content source ${sourceRoot}`)
  } else {
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
  }

  for (const collection of collections) {
    const source = join(sourceRoot, collection)
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

  const assetsSource = join(sourceRoot, 'assets')
  if (await exists(assetsSource)) {
    await rm(generatedAssetsDir, { recursive: true, force: true })
    await mkdir(dirname(generatedAssetsDir), { recursive: true })
    await cp(assetsSource, generatedAssetsDir, {
      recursive: true,
      force: true,
      preserveTimestamps: true,
    })
    console.log('[content] synced assets/')
  } else {
    await rm(generatedAssetsDir, { recursive: true, force: true })
  }

  await rm(join(root, '.astro'), { recursive: true, force: true })
  await rm(join(root, 'node_modules', '.astro'), { recursive: true, force: true })
  console.log('[content] cleared Astro content cache')
}
