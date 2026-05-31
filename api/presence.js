const normalizeText = (value) => value === undefined || value === null ? '' : String(value).trim()

const toTimestamp = (value) => {
  if (!value) return 0
  const numberValue = Number(value)
  if (Number.isFinite(numberValue)) {
    return numberValue > 1e12 ? numberValue : numberValue * 1000
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const toIso = (value) => {
  const timestamp = toTimestamp(value)
  return timestamp ? new Date(timestamp).toISOString() : ''
}

const activityTypeLabels = {
  0: 'Playing',
  1: 'Streaming',
  2: 'Listening',
  3: 'Watching',
  4: 'Custom',
  5: 'Competing',
}

const normalizeDiscordActivity = (activity = {}) => {
  const emoji = activity.emoji?.name || activity.emoji?.id || ''

  return {
    name: normalizeText(activity.name),
    type: activityTypeLabels[activity.type] || String(activity.type ?? ''),
    details: normalizeText(activity.details),
    state: normalizeText(activity.state),
    emoji: normalizeText(emoji),
    url: normalizeText(activity.url),
    applicationId: normalizeText(activity.application_id),
    startedAt: toIso(activity.timestamps?.start),
    endedAt: toIso(activity.timestamps?.end),
    largeImage: normalizeText(activity.assets?.large_image),
    largeText: normalizeText(activity.assets?.large_text),
    smallImage: normalizeText(activity.assets?.small_image),
    smallText: normalizeText(activity.assets?.small_text),
  }
}

const getDiscordPresence = async () => {
  const userId = normalizeText(process.env.LANYARD_USER_ID)
  if (!userId) {
    return {
      configured: false,
      status: 'unconfigured',
      activities: [],
      spotify: null,
      updatedAt: new Date().toISOString(),
    }
  }

  const response = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`, {
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    return {
      configured: true,
      error: `lanyard_${response.status}`,
      status: 'unknown',
      activities: [],
      spotify: null,
      updatedAt: new Date().toISOString(),
    }
  }

  const payload = await response.json()
  const data = payload?.data || {}
  const activities = Array.isArray(data.activities)
    ? data.activities.map(normalizeDiscordActivity).filter((activity) => activity.name || activity.details || activity.state)
    : []

  return {
    configured: true,
    status: normalizeText(data.discord_status || 'offline'),
    activeOnDesktop: Boolean(data.active_on_discord_desktop),
    activeOnMobile: Boolean(data.active_on_discord_mobile),
    activeOnWeb: Boolean(data.active_on_discord_web),
    activities,
    spotify: data.listening_to_spotify && data.spotify
      ? {
          song: normalizeText(data.spotify.song),
          artist: normalizeText(data.spotify.artist),
          album: normalizeText(data.spotify.album),
          albumArtUrl: normalizeText(data.spotify.album_art_url),
          startedAt: toIso(data.spotify.timestamps?.start),
          endedAt: toIso(data.spotify.timestamps?.end),
        }
      : null,
    kv: data.kv && typeof data.kv === 'object' ? data.kv : {},
    updatedAt: new Date().toISOString(),
  }
}

const callWeread = async (apiName, params = {}) => {
  const apiKey = normalizeText(process.env.WEREAD_API_KEY)
  if (!apiKey) return null

  const response = await fetch('https://i.weread.qq.com/api/agent/gateway', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      api_name: apiName,
      skill_version: normalizeText(process.env.WEREAD_SKILL_VERSION) || '1.0.3',
      ...params,
    }),
  })

  if (!response.ok) {
    throw new Error(`weread_${apiName}_${response.status}`)
  }

  return response.json()
}

const getNested = (payload, paths) => {
  for (const path of paths) {
    const value = path.reduce((current, key) => current?.[key], payload)
    if (value !== undefined && value !== null) return value
  }

  return undefined
}

const extractBooks = (payload) => {
  const books = getNested(payload, [
    ['books'],
    ['data', 'books'],
    ['result', 'books'],
    ['response', 'books'],
  ])

  return Array.isArray(books) ? books : []
}

const extractProgress = (payload) => {
  return getNested(payload, [
    ['book'],
    ['data', 'book'],
    ['result', 'book'],
    ['response', 'book'],
  ]) || {}
}

const normalizeBook = (book = {}, progress = {}) => {
  const bookId = normalizeText(book.bookId || book.bookid || book.id)
  const lastReadAt = toIso(progress.updateTime || book.readUpdateTime || book.updateTime)
  const progressValue = Number(progress.progress ?? book.progress ?? book.readingProgress)

  return {
    bookId,
    title: normalizeText(book.title || book.name),
    author: normalizeText(book.author),
    cover: normalizeText(book.cover),
    progress: Number.isFinite(progressValue) ? Math.max(0, Math.min(100, progressValue)) : null,
    lastReadAt,
    readingTimeSeconds: Number(progress.recordReadingTime || book.recordReadingTime || 0) || 0,
  }
}

const getWereadReading = async () => {
  if (!normalizeText(process.env.WEREAD_API_KEY)) {
    return {
      configured: false,
      books: [],
      updatedAt: new Date().toISOString(),
    }
  }

  try {
    const shelf = await callWeread('/shelf/sync')
    const limit = Math.max(1, Math.min(6, Number(process.env.WEREAD_BOOK_LIMIT || 3)))
    const recentBooks = extractBooks(shelf)
      .filter((book) => normalizeText(book.bookId || book.bookid || book.id))
      .sort((a, b) => toTimestamp(b.readUpdateTime || b.updateTime) - toTimestamp(a.readUpdateTime || a.updateTime))
      .slice(0, limit)

    const books = await Promise.all(recentBooks.map(async (book) => {
      const bookId = normalizeText(book.bookId || book.bookid || book.id)

      try {
        const progressPayload = await callWeread('/book/getprogress', { bookId })
        return normalizeBook(book, extractProgress(progressPayload))
      } catch {
        return normalizeBook(book)
      }
    }))

    return {
      configured: true,
      books,
      updatedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      configured: true,
      error: error instanceof Error ? error.message : 'weread_error',
      books: [],
      updatedAt: new Date().toISOString(),
    }
  }
}

const getPresence = async () => {
  const [discordResult, readingResult] = await Promise.allSettled([
    getDiscordPresence(),
    getWereadReading(),
  ])

  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    discord: discordResult.status === 'fulfilled'
      ? discordResult.value
      : { configured: Boolean(process.env.LANYARD_USER_ID), error: 'discord_error', activities: [] },
    reading: readingResult.status === 'fulfilled'
      ? readingResult.value
      : { configured: Boolean(process.env.WEREAD_API_KEY), error: 'weread_error', books: [] },
  }
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ ok: false, error: 'method_not_allowed' })
    return
  }

  response.setHeader('cache-control', 'no-store')
  response.status(200).json(await getPresence())
}
