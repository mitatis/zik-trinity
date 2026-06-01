#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const markdownExtensions = new Set(['.md', '.mdx'])
const brPattern = /^<br\s*\/?>$/i

const stripTrailingWhitespace = (line) => line.replace(/[ \t]+$/g, '')
const isBlank = (line) => line.trim() === ''
const isBreak = (line) => brPattern.test(line.trim())

const splitFrontmatter = (source) => {
  const normalized = source.replace(/\r\n/g, '\n')
  const match = normalized.match(/^---\n[\s\S]*?\n---[ \t]*(?:\n|$)/)

  if (!match) {
    return { frontmatter: '', body: normalized }
  }

  return {
    frontmatter: match[0].replace(/\n*$/, '\n'),
    body: normalized.slice(match[0].length),
  }
}

const compactStanzas = (stanzas) =>
  stanzas
    .map((stanza) => stanza.filter(Boolean).join('\n').trim())
    .filter(Boolean)
    .join('\n\n')

const normalizeBodyWithBreakTags = (lines) => {
  const stanzas = []
  let current = []

  for (const line of lines) {
    if (isBreak(line)) {
      stanzas.push(current)
      current = []
      continue
    }

    if (isBlank(line)) {
      continue
    }

    current.push(stripTrailingWhitespace(line))
  }

  stanzas.push(current)
  return compactStanzas(stanzas)
}

const normalizeLegacySpacedBody = (lines) => {
  const stanzas = []
  let current = []
  let blankRun = 0

  for (const line of lines) {
    if (isBlank(line)) {
      blankRun += 1
      continue
    }

    if (blankRun >= 2 && current.length > 0) {
      stanzas.push(current)
      current = []
    }

    current.push(stripTrailingWhitespace(line))
    blankRun = 0
  }

  stanzas.push(current)
  return compactStanzas(stanzas)
}

const normalizeCanonicalBody = (lines) => {
  const stanzas = []
  let current = []

  for (const line of lines) {
    if (isBlank(line)) {
      if (current.length > 0) {
        stanzas.push(current)
        current = []
      }
      continue
    }

    current.push(stripTrailingWhitespace(line))
  }

  stanzas.push(current)
  return compactStanzas(stanzas)
}

export const normalizePoetryMarkdown = (source) => {
  const { frontmatter, body } = splitFrontmatter(source)
  const bodyLines = body
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(stripTrailingWhitespace)

  while (bodyLines.length > 0 && isBlank(bodyLines[0])) {
    bodyLines.shift()
  }

  while (bodyLines.length > 0 && isBlank(bodyLines[bodyLines.length - 1])) {
    bodyLines.pop()
  }

  const hasBreakTags = bodyLines.some(isBreak)
  const textLines = bodyLines.filter((line) => !isBlank(line) && !isBreak(line))
  const hasAdjacentTextLines = bodyLines.some((line, index) => {
    if (index === 0 || isBlank(line) || isBreak(line)) return false
    const previous = bodyLines[index - 1]
    return !isBlank(previous) && !isBreak(previous)
  })

  let normalizedBody = ''

  if (hasBreakTags) {
    normalizedBody = normalizeBodyWithBreakTags(bodyLines)
  } else if (textLines.length > 1 && !hasAdjacentTextLines) {
    normalizedBody = normalizeLegacySpacedBody(bodyLines)
  } else {
    normalizedBody = normalizeCanonicalBody(bodyLines)
  }

  return `${frontmatter}${frontmatter ? '\n' : ''}${normalizedBody}\n`
}

export const normalizePoetryDirectory = async (dir, { check = false } = {}) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const changed = []

  for (const entry of entries) {
    if (!entry.isFile() || !markdownExtensions.has(extname(entry.name))) {
      continue
    }

    const path = join(dir, entry.name)
    const original = await readFile(path, 'utf8')
    const normalized = normalizePoetryMarkdown(original)

    if (normalized === original.replace(/\r\n/g, '\n')) {
      continue
    }

    changed.push(path)

    if (!check) {
      await writeFile(path, normalized)
    }
  }

  return changed
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url)

if (isCli) {
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const dirArg = args.find((arg) => arg !== '--check')

  if (!dirArg) {
    console.error('Usage: node scripts/normalize-poetry.mjs [--check] <poetry-dir>')
    process.exit(2)
  }

  const dir = resolve(dirArg)
  const changed = await normalizePoetryDirectory(dir, { check })

  for (const path of changed) {
    console.log(`${check ? 'would format' : 'formatted'} ${path}`)
  }

  if (check && changed.length > 0) {
    process.exit(1)
  }
}
