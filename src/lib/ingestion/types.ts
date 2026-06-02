export interface RedditPost {
  id: string
  name: string
  subreddit: string
  title: string
  selftext: string
  url: string
  author: string
  score: number
  num_comments: number
  created_utc: number
  permalink: string
  is_self: boolean
}

export interface RedditComment {
  id: string
  name: string
  subreddit: string
  body: string
  author: string
  score: number
  created_utc: number
  permalink: string
  link_id: string
  parent_id: string
}

export interface IngestResult {
  fetched: number
  inserted: number
  skipped: number
  errors: string[]
}
