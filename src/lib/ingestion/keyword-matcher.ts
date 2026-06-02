export interface Keyword {
  id: string
  term: string
  is_brand: boolean
}

export function matchKeywords(text: string, keywords: Keyword[]): Keyword | null {
  const lower = text.toLowerCase()
  for (const kw of keywords) {
    const term = kw.term.toLowerCase()
    if (lower.includes(term)) return kw
  }
  return null
}

export function matchesAny(text: string, keywords: Keyword[]): boolean {
  return matchKeywords(text, keywords) !== null
}
