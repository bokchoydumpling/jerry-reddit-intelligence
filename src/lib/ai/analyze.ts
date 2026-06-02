import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface MentionAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  sentiment_score: number
  sarcasm: boolean
  sarcasm_confidence: number
  intent: 'complaint' | 'question' | 'recommendation' | 'comparison' | 'praise' | 'trust-question' | 'general'
  urgency: number
  trust_impact: 'positive' | 'neutral' | 'negative'
  priority_score: number
  team_owner: 'support' | 'marketing' | 'product' | 'leadership' | 'none'
  recommended_action: 'respond' | 'monitor' | 'escalate' | 'ignore'
}

const SYSTEM_PROMPT = `You are an AI analyst for Jerry, a car insurance company. Analyze Reddit mentions and return a JSON object with ONLY these fields:

{
  "sentiment": "positive"|"neutral"|"negative"|"mixed",
  "sentiment_score": float -1.0 to 1.0,
  "sarcasm": boolean,
  "sarcasm_confidence": float 0.0 to 1.0,
  "intent": "complaint"|"question"|"recommendation"|"comparison"|"praise"|"trust-question"|"general",
  "urgency": integer 1-5,
  "trust_impact": "positive"|"neutral"|"negative",
  "priority_score": integer 0-100,
  "team_owner": "support"|"marketing"|"product"|"leadership"|"none",
  "recommended_action": "respond"|"monitor"|"escalate"|"ignore"
}

priority_score guidelines:
- 80-100: urgent brand threat or high-visibility post needing immediate response
- 60-79: meaningful mention with respond opportunity
- 40-59: worth monitoring
- 0-39: low impact, can ignore

trust-question intent: user is specifically asking whether Jerry is trustworthy or safe to use.
escalate: leadership needs to see this immediately (legal risk, viral negative, major outage mention).

Return ONLY valid JSON. No explanation.`

export async function analyzeMention(text: string, subreddit: string, score: number): Promise<MentionAnalysis> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Subreddit: r/${subreddit}\nScore: ${score}\n\nText:\n${text.slice(0, 2000)}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'

  try {
    return JSON.parse(raw) as MentionAnalysis
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as MentionAnalysis
    throw new Error(`Failed to parse analysis: ${raw}`)
  }
}

export async function generateResponse(
  mentionText: string,
  analysis: MentionAnalysis,
  subreddit: string,
  tone: 'professional' | 'empathetic' | 'casual' = 'professional'
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: `You write Reddit responses on behalf of Jerry, a car insurance tech company.
Write in first-person plural ("we at Jerry"). Be helpful, specific, and genuine.
Never be defensive. Match the tone requested.
TONE: ${tone}
Keep response under 150 words. No hashtags. Sound human, not corporate.
Return ONLY the response text with no preamble.`,
    messages: [
      {
        role: 'user',
        content: `Subreddit: r/${subreddit}
Intent: ${analysis.intent}
Sentiment: ${analysis.sentiment}
Urgency: ${analysis.urgency}/5

Original post/comment:
${mentionText.slice(0, 1500)}

Write a Reddit reply.`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}

export async function generateExecutiveSummary(
  metrics: {
    totalMentions: number
    sentimentBreakdown: Record<string, number>
    topIntents: Record<string, number>
    highPriorityCount: number
    trustQuestionCount: number
    avgPriorityScore: number
    topSubreddits: { subreddit: string; count: number }[]
    competitorMentions: Record<string, number>
  },
  periodLabel: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: `You write executive intelligence briefings for Jerry's leadership team.
Be direct, data-driven, and actionable. Lead with the most important insight.
Format as 3-4 short paragraphs. No bullet points. No headers.`,
    messages: [
      {
        role: 'user',
        content: `Write a ${periodLabel} Reddit intelligence summary for Jerry (car insurance).

Data:
${JSON.stringify(metrics, null, 2)}`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}
