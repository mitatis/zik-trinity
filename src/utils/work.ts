type WorkEntry = {
  data: Record<string, unknown>
}

const fieldAliases = {
  workStart: ['work_start', 'Work start', 'Work Start', 'work start', 'workStart'],
  workEnd: ['work_end', 'Work end', 'Work End', 'work end', 'workEnd'],
  workDuration: ['work_duration', 'Work duration', 'Work Duration', 'work duration', 'workDuration'],
  startLocation: ['start_location', 'Start location', 'Start Location', 'start location', 'startLocation'],
  endLocation: ['end_location', 'End location', 'End Location', 'end location', 'endLocation'],
  startPlace: ['上班地点', '上班位置', 'start_place', 'Start place', 'Start Place', 'work_start_place', 'workStartPlace'],
  endPlace: ['下班地点', '下班位置', 'end_place', 'End place', 'End Place', 'work_end_place', 'workEndPlace'],
  status: ['status', 'Status'],
} as const

const getFieldValue = (data: Record<string, unknown>, aliases: readonly string[]) => {
  for (const alias of aliases) {
    const value = data[alias]
    if (value !== undefined && value !== null && value !== '') return value
  }

  return undefined
}

const dateWithTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
const timezonePattern = /(Z|[+-]\d{2}:?\d{2})$/i
const coordinatePattern = /^\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?$/

const fromUtcPartsAsLocal = (value: Date): Date => {
  return new Date(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
    value.getUTCHours(),
    value.getUTCMinutes(),
    value.getUTCSeconds(),
    value.getUTCMilliseconds()
  )
}

const formatLocalDateTime = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

const parseDateValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : fromUtcPartsAsLocal(value)
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    const localMatch = trimmedValue.match(dateWithTimePattern)
    if (localMatch && !timezonePattern.test(trimmedValue)) {
      const [, year, month, day, hours, minutes, seconds = '0'] = localMatch
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds))
    }

    const date = new Date(trimmedValue)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

const normalizeText = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const parseCoordinate = (value: unknown) => {
  const text = normalizeText(value)
  const match = text.match(coordinatePattern)
  if (!match) return null

  const first = Number(match[1])
  const second = Number(match[2])
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null

  const likelyLatLng = Math.abs(first) <= 90 && Math.abs(second) > 90
  return likelyLatLng
    ? { latitude: first, longitude: second, raw: text }
    : { latitude: second, longitude: first, raw: text }
}

const buildMapUrl = (coordinate: ReturnType<typeof parseCoordinate>) => {
  if (!coordinate) return ''

  const coordinateQuery = encodeURIComponent(`${coordinate.latitude},${coordinate.longitude}`)
  return `https://maps.apple.com/?ll=${coordinate.latitude},${coordinate.longitude}&q=${coordinateQuery}&z=16`
}

export const formatClockTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export const formatWorkDurationMinutes = (minutesValue: number): string => {
  const totalMinutes = Math.max(0, Math.round(minutesValue))
  if (totalMinutes < 1) return '少于1分钟'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours && minutes) return `${hours} 小时 ${minutes} 分钟`
  if (hours) return `${hours} 小时`
  return `${minutes} 分钟`
}

export const formatWorkDuration = (milliseconds: number): string => {
  return formatWorkDurationMinutes(Math.round(milliseconds / 60000))
}

const formatDurationValue = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatWorkDurationMinutes(value)
  }

  const text = normalizeText(value)
  if (!text) return ''

  const minutes = Number(text)
  if (Number.isFinite(minutes) && /^-?\d+(?:\.\d+)?$/.test(text)) {
    return formatWorkDurationMinutes(minutes)
  }

  return text
}

export const dateToLocalKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getWorkMeta = (entry: WorkEntry) => {
  const workStart = parseDateValue(getFieldValue(entry.data, fieldAliases.workStart))
  const workEnd = parseDateValue(getFieldValue(entry.data, fieldAliases.workEnd))
  const rawDuration = getFieldValue(entry.data, fieldAliases.workDuration)
  const startLocation = normalizeText(getFieldValue(entry.data, fieldAliases.startLocation))
  const endLocation = normalizeText(getFieldValue(entry.data, fieldAliases.endLocation))
  const startPlace = normalizeText(getFieldValue(entry.data, fieldAliases.startPlace))
  const endPlace = normalizeText(getFieldValue(entry.data, fieldAliases.endPlace))
  const status = normalizeText(getFieldValue(entry.data, fieldAliases.status))
  const isActive = status.toLowerCase() === 'active'
  const isDone = ['done', 'down'].includes(status.toLowerCase()) || Boolean(workEnd)
  const startCoordinate = parseCoordinate(startLocation)
  const endCoordinate = parseCoordinate(endLocation)
  const startPlaceLabel = startPlace || (startCoordinate ? '查看上班位置' : startLocation)
  const endPlaceLabel = endPlace || (endCoordinate ? '查看下班位置' : endLocation)

  if (!workStart && !workEnd && !rawDuration && !startLocation && !endLocation && !startPlace && !endPlace && !status) {
    return null
  }

  const durationLabel = formatDurationValue(rawDuration) || (workStart && workEnd ? formatWorkDuration(workEnd.getTime() - workStart.getTime()) : '')

  return {
    workStart,
    workEnd,
    startTimeLabel: workStart ? formatClockTime(workStart) : '',
    endTimeLabel: workEnd ? formatClockTime(workEnd) : '',
    timeRangeLabel: workStart || workEnd
      ? `${workStart ? formatClockTime(workStart) : '--:--'} ~ ${workEnd ? formatClockTime(workEnd) : '进行中'}`
      : '',
    durationLabel,
    startLocation,
    endLocation,
    startPlace,
    endPlace,
    startPlaceLabel,
    endPlaceLabel,
    startMapUrl: buildMapUrl(startCoordinate),
    endMapUrl: buildMapUrl(endCoordinate),
    status,
    isActive,
    isDone,
    startIso: workStart ? formatLocalDateTime(workStart) : '',
    endIso: workEnd ? formatLocalDateTime(workEnd) : '',
  }
}
