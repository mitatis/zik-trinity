#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { constants } from 'node:fs'
import { access, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
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
const markdownExtensions = new Set(['.md', '.mdx'])

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

const assertNoLegacyAssetsDir = async (sourceRoot) => {
  const legacyAssetsDir = join(sourceRoot, 'assets')

  if (await exists(legacyAssetsDir)) {
    throw new Error(
      '[content] legacy assets/ directory found; rename it to content-assets/ before syncing'
    )
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

const normalizeMarkdownAssetUrls = (content) =>
  content
    .replace(/(\]\()(?:(?:\.\.\/)+|\.\/)?content-assets\//g, '$1/content-assets/')
    .replace(
      /(<img\b[^>]*\bsrc=["'])(?:(?:\.\.\/)+|\.\/)?content-assets\//gi,
      '$1/content-assets/'
    )
    .replace(
      /^(\s*(?:heroImage|image)\s*:\s*["']?)(?:(?:\.\.\/)+|\.\/)?content-assets\//gim,
      '$1/content-assets/'
    )

const legacyAssetUrlPattern =
  /(?:\]\(|<img\b[^>]*\bsrc=["']|^\s*(?:heroImage|image)\s*:\s*["']?)(?:(?:\.\.\/)+|\.\/|\/)?assets\//gim

const normalizeGeneratedAssetPaths = async (dir) => {
  let normalizedFiles = 0
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      normalizedFiles += await normalizeGeneratedAssetPaths(path)
      continue
    }

    if (!entry.isFile() || !markdownExtensions.has(extname(entry.name))) {
      continue
    }

    const original = await readFile(path, 'utf8')
    const normalized = normalizeMarkdownAssetUrls(original)

    if (normalized !== original) {
      await writeFile(path, normalized)
      normalizedFiles += 1
    }
  }

  return normalizedFiles
}

const assertNoLegacyAssetUrls = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      await assertNoLegacyAssetUrls(path)
      continue
    }

    if (!entry.isFile() || !markdownExtensions.has(extname(entry.name))) {
      continue
    }

    const content = await readFile(path, 'utf8')

    if (legacyAssetUrlPattern.test(content)) {
      legacyAssetUrlPattern.lastIndex = 0
      throw new Error(
        `[content] legacy assets/ reference found in ${relative(root, path)}; use content-assets/`
      )
    }

    legacyAssetUrlPattern.lastIndex = 0
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

  await assertNoLegacyAssetsDir(sourceRoot)

  for (const collection of collections) {
    const source = join(sourceRoot, collection)
    const target = join(root, 'src/content', collection)

    if (!(await exists(source))) {
      await rm(target, { recursive: true, force: true })
      await mkdir(target, { recursive: true })
      console.warn(
        `[content] ${collection}/ not found in content repository; created empty collection`
      )
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

    await assertNoLegacyAssetUrls(target)

    const normalizedFiles = await normalizeGeneratedAssetPaths(target)
    if (normalizedFiles > 0) {
      console.log(
        `[content] normalized local asset paths in ${normalizedFiles} ${collection} file(s)`
      )
    }
  }

  const assetsSource = join(sourceRoot, 'content-assets')

  await rm(generatedAssetsDir, { recursive: true, force: true })

  if (await exists(assetsSource)) {
    await mkdir(generatedAssetsDir, { recursive: true })
    await cp(assetsSource, generatedAssetsDir, {
      recursive: true,
      force: true,
      preserveTimestamps: true,
    })

    console.log(
      '[content] synced content-assets/ -> public/content-assets/'
    )
  }

  await rm(join(root, '.astro'), { recursive: true, force: true })
  await rm(join(root, 'node_modules', '.astro'), { recursive: true, force: true })
  console.log('[content] cleared Astro content cache')
}
