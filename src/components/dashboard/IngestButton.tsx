'use client'

import { useState } from 'react'

export default function IngestButton() {
  const [state, setState] = useState<'idle' | 'ingesting' | 'analyzing' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<string | null>(null)

  async function run() {
    setState('ingesting')
    setResult(null)

    const ingestRes = await fetch('/api/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const ingestData = await ingestRes.json()

    if (!ingestRes.ok) {
      setState('error')
      setResult(ingestData.error ?? 'Ingest failed')
      return
    }

    setState('analyzing')

    const analyzeRes = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const analyzeData = await analyzeRes.json()

    if (!analyzeRes.ok) {
      setState('error')
      setResult(analyzeData.error ?? 'Analysis failed')
      return
    }

    setState('done')
    setResult(`Fetched ${ingestData.inserted ?? 0} new mentions · Analyzed ${analyzeData.processed ?? 0}`)

    setTimeout(() => {
      setState('idle')
      setResult(null)
      window.location.reload()
    }, 3000)
  }

  const labels = {
    idle: 'Run Ingestion',
    ingesting: 'Fetching Reddit…',
    analyzing: 'Analyzing with AI…',
    done: 'Done!',
    error: 'Error',
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className={`text-xs ${state === 'error' ? 'text-[#f43f5e]' : 'text-[#10b981]'}`}>
          {result}
        </span>
      )}
      <button
        onClick={run}
        disabled={state !== 'idle'}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FB3D78] text-white text-sm font-semibold hover:bg-[#f91f63] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {(state === 'ingesting' || state === 'analyzing') && (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {labels[state]}
      </button>
    </div>
  )
}
