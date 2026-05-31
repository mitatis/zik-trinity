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

const steamPersonaStates = {
  0: 'offline',
  1: 'online',
  2: 'busy',
  3: 'away',
  4: 'snooze',
  5: 'looking_to_trade',
  6: 'looking_to_play',
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

const getSteamPresence = async () => {
  const apiKey = normalizeText(process.env.STEAM_API_KEY)
  const steamId = normalizeText(process.env.STEAM_ID)
  if (!apiKey || !steamId) {
    return {
      configured: false,
      status: 'unconfigured',
      isInGame: false,
      updatedAt: new Date().toISOString(),
    }
  }

  const summaryParams = new URLSearchParams({
    key: apiKey,
    steamids: steamId,
  })
  const response = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?${summaryParams}`, {
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    return {
      configured: true,
      error: `steam_${response.status}`,
      status: 'unknown',
      isInGame: false,
      updatedAt: new Date().toISOString(),
    }
  }

  const payload = await response.json()
  const player = payload?.response?.players?.[0]
  if (!player) {
    return {
      configured: true,
      error: 'steam_player_not_found',
      status: 'unknown',
      isInGame: false,
      updatedAt: new Date().toISOString(),
    }
  }

  const gameName = normalizeText(player.gameextrainfo)
  const gameId = normalizeText(player.gameid)
  const recentGames = await getSteamRecentGames(apiKey, steamId)
  const achievementSummary = await getSteamAchievementSummary(apiKey, steamId, [
    gameId,
    ...recentGames.map((game) => game.appId),
  ])

  return {
    configured: true,
    status: steamPersonaStates[Number(player.personastate)] || 'unknown',
    isInGame: Boolean(gameName || gameId),
    personaName: normalizeText(player.personaname),
    profileUrl: normalizeText(player.profileurl),
    avatar: normalizeText(player.avatarmedium || player.avatarfull || player.avatar),
    game: {
      id: gameId,
      name: gameName || (gameId ? `Steam App ${gameId}` : ''),
    },
    recentGames,
    achievementSummary,
    updatedAt: new Date().toISOString(),
  }
}

const steamHeaderUrl = (appId) => appId
  ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${encodeURIComponent(appId)}/header.jpg`
  : ''

const normalizeSteamGame = (game = {}) => {
  const appId = normalizeText(game.appid || game.appId)

  return {
    appId,
    name: normalizeText(game.name),
    playtime2WeeksMinutes: Number(game.playtime_2weeks ?? game.playtime2WeeksMinutes ?? 0) || 0,
    playtimeForeverMinutes: Number(game.playtime_forever ?? game.playtimeForeverMinutes ?? 0) || 0,
    lastPlayedAt: toIso(game.rtime_last_played),
    iconUrl: game.img_icon_url
      ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${game.img_icon_url}.jpg`
      : '',
    headerUrl: steamHeaderUrl(appId),
  }
}

const getSteamRecentGames = async (apiKey, steamId) => {
  const limit = Math.max(1, Math.min(10, Number(process.env.STEAM_RECENT_LIMIT || 3)))
  const params = new URLSearchParams({
    key: apiKey,
    steamid: steamId,
    count: String(limit),
    format: 'json',
  })

  try {
    const response = await fetch(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?${params}`, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return []

    const payload = await response.json()
    const games = payload?.response?.games
    if (!Array.isArray(games)) return []

    return games.map(normalizeSteamGame).filter((game) => game.appId && game.name)
  } catch {
    return []
  }
}

const getSteamAchievementSummary = async (apiKey, steamId, candidateAppIds) => {
  const limit = Math.max(0, Math.min(5, Number(process.env.STEAM_ACHIEVEMENT_GAME_LIMIT || 3)))
  const appIds = Array.from(new Set(candidateAppIds.map(normalizeText).filter(Boolean))).slice(0, limit)
  if (!appIds.length) {
    return {
      checkedGames: 0,
      unlocked: 0,
      total: 0,
    }
  }

  const summaries = await Promise.all(appIds.map(async (appId) => {
    const params = new URLSearchParams({
      key: apiKey,
      steamid: steamId,
      appid: appId,
      l: 'schinese',
    })

    try {
      const response = await fetch(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?${params}`, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) return null

      const payload = await response.json()
      const achievements = payload?.playerstats?.achievements
      if (!Array.isArray(achievements)) return null

      return {
        appId,
        gameName: normalizeText(payload?.playerstats?.gameName),
        unlocked: achievements.filter((achievement) => Number(achievement.achieved) === 1).length,
        total: achievements.length,
      }
    } catch {
      return null
    }
  }))

  const games = summaries.filter(Boolean)

  return {
    checkedGames: games.length,
    unlocked: games.reduce((sum, game) => sum + game.unlocked, 0),
    total: games.reduce((sum, game) => sum + game.total, 0),
    games,
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
    readingTimeSeconds: (Number(progress.recordReadingTime || book.recordReadingTime || 0) || 0)
      || ((Number(progress.readingTime || book.readingTime || 0) || 0) * 60),
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
    const candidateLimit = Math.max(limit, Math.min(24, Number(process.env.WEREAD_CANDIDATE_LIMIT || 12)))
    const minReadingMinutes = Math.max(0, Number(process.env.WEREAD_MIN_READING_MINUTES || 10) || 0)
    const minReadingSeconds = minReadingMinutes * 60
    const recentBooks = extractBooks(shelf)
      .filter((book) => normalizeText(book.bookId || book.bookid || book.id))
      .sort((a, b) => toTimestamp(b.readUpdateTime || b.updateTime) - toTimestamp(a.readUpdateTime || a.updateTime))
      .slice(0, candidateLimit)

    const books = await Promise.all(recentBooks.map(async (book) => {
      const bookId = normalizeText(book.bookId || book.bookid || book.id)

      try {
        const progressPayload = await callWeread('/book/getprogress', { bookId })
        return normalizeBook(book, extractProgress(progressPayload))
      } catch {
        return normalizeBook(book)
      }
    }))
    const displayBooks = books
      .filter((book) => minReadingSeconds === 0 || book.readingTimeSeconds >= minReadingSeconds)
      .slice(0, limit)

    return {
      configured: true,
      books: displayBooks,
      minReadingMinutes,
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
  const [discordResult, steamResult, readingResult] = await Promise.allSettled([
    getDiscordPresence(),
    getSteamPresence(),
    getWereadReading(),
  ])

  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    discord: discordResult.status === 'fulfilled'
      ? discordResult.value
      : { configured: Boolean(process.env.LANYARD_USER_ID), error: 'discord_error', activities: [] },
    steam: steamResult.status === 'fulfilled'
      ? steamResult.value
      : { configured: Boolean(process.env.STEAM_API_KEY && process.env.STEAM_ID), error: 'steam_error', isInGame: false },
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
