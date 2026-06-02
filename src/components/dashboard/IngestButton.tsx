'use client'

import { useState } from 'react'

type State = 'idle' | 'ingesting' | 'analyzing' | 'done' | 'error'

export default function IngestButton() {
  const [state, setState] = useState<State>('idle')
  const [result, setResult] = useState<string | null>(null)

  async function run() {
    setState('ingesting')
    setResult(null)

    try {
      const ingestRes = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      let ingestData: Record<string, unknown> = {}
      try {
        ingestData = await ingestRes.json()
      } catch {
        ingestData = {}
      }

      if (!ingestRes.ok) {
        setState('error')
        setResult(String(ingestData.error ?? `Ingest failed (${ingestRes.status})`))
        return
      }

      setState('analyzing')

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      let analyzeData: Record<string, unknown> = {}
      try {
        analyzeData = await analyzeRes.json()
      } catch {
        analyzeData = {}
      }

      if (!analyzeRes.ok) {
        setState('error')
        setResult(String(analyzeData.error ?? `Analysis failed (${analyzeRes.status})`))
        return
      }

      setState('done')
      setResult(
        `Fetched ${ingestData.inserted ?? 0} new · Analyzed ${analyzeData.processed ?? 0}`
      )

      setTimeout(() => {
        setState('idle')
        setResult(null)
        window.location.reload()
      }, 3000)
    } catch (err) {
      setState('error')
      setResult((err as Error).message ?? 'Unexpected error')
      console.error('[IngestButton]', err)
    }
  }

  function reset() {
    setState('idle')
    setResult(null)
  }

  const labels: Record<State, string> = {
    idle: 'Run Ingestion',
    ingesting: 'Fetching Reddit…',
    analyzing: 'Analyzing with AI…',
    done: 'Done!',
    error: 'Retry',
  }

  const busy = state === 'ingesting' || state === 'analyzing'

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span
          className={`text-xs max-w-xs truncate ${state === 'error' ? 'text-[#f43f5e]' : 'text-[#10b981]'}`}
          title={result}
        >
          {result}
        </span>
      )}
      <button
        type="button"
        onClick={state === 'error' ? reset : run}
        disabled={busy}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FB3D78] text-white text-sm font-semibold hover:bg-[#f91f63] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy && (
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
