type ContentEntry = {
  body?: string
  slug: string
  data: Record<string, unknown>
}

export const getEntryDate = (entry: ContentEntry): Date | null => {
  const value = entry.data.pubDate

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

export const getEntryTitle = (entry: ContentEntry): string | undefined => {
  const title = entry.data.title
  return typeof title === 'string' && title.trim() ? title.trim() : undefined
}

export const getEntryDescription = (entry: ContentEntry): string | undefined => {
  const description = entry.data.description
  return typeof description === 'string' && description.trim()
    ? description.trim()
    : undefined
}

export const getEntryTags = (entry: ContentEntry): string[] => {
  const tags = entry.data.tags
  if (!Array.isArray(tags)) return []

  return tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
}

export const isDraftEntry = (entry: ContentEntry): boolean => {
  const draft = entry.data.draft
  return draft === true || draft === 'true'
}

export const isPublishedEntry = (entry: ContentEntry): boolean => {
  return !isDraftEntry(entry) && Boolean(getEntryTitle(entry)) && Boolean(getEntryDate(entry))
}

export const sortByPubDateDesc = (a: ContentEntry, b: ContentEntry): number => {
  return (getEntryDate(b)?.getTime() ?? 0) - (getEntryDate(a)?.getTime() ?? 0)
}
