'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Keyword {
  id: string
  term: string
  is_brand: boolean
  active: boolean
}

export default function KeywordManager({ keywords }: { keywords: Keyword[] }) {
  const [term, setTerm] = useState('')
  const [isBrand, setIsBrand] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function addKeyword(e: React.FormEvent) {
    e.preventDefault()
    if (!term.trim()) return
    setLoading(true)
    await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term: term.trim(), is_brand: isBrand }),
    })
    setTerm('')
    setIsBrand(false)
    setLoading(false)
    router.refresh()
  }

  async function removeKeyword(id: string) {
    await fetch(`/api/keywords/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-5">
      <h2 className="text-sm font-semibold text-[#FEFEFE] mb-4">Tracked Keywords</h2>

      <div className="space-y-2 mb-5">
        {keywords.length === 0 ? (
          <p className="text-xs text-[#475569]">No keywords yet. Add "jerry", "jerry insurance", etc.</p>
        ) : (
          keywords.map((kw) => (
            <div key={kw.id} className="flex items-center justify-between py-2 border-b border-[#1e2d42]">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#FEFEFE]">{kw.term}</span>
                {kw.is_brand && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#FB3D78]/10 text-[#FB3D78] rounded">Brand</span>
                )}
                {!kw.active && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#1e2d42] text-[#64748b] rounded">Inactive</span>
                )}
              </div>
              <button
                onClick={() => removeKeyword(kw.id)}
                className="text-xs text-[#f43f5e] hover:underline"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addKeyword} className="space-y-3">
        <div>
          <label className="block text-xs text-[#64748b] mb-1">Keyword</label>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="e.g. jerry insurance"
            className="w-full px-3 py-2 rounded-lg bg-[#141D2C] border border-[#1e2d42] text-sm text-[#FEFEFE] placeholder-[#475569] focus:outline-none focus:border-[#FB3D78] transition-colors"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isBrand}
            onChange={(e) => setIsBrand(e.target.checked)}
            className="w-4 h-4 accent-[#FB3D78]"
          />
          <span className="text-xs text-[#94a3b8]">Brand keyword (Jerry-specific)</span>
        </label>
        <button
          type="submit"
          disabled={loading || !term.trim()}
          className="w-full py-2 rounded-lg bg-[#FB3D78] text-white text-sm font-semibold hover:bg-[#f91f63] transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding…' : 'Add Keyword'}
        </button>
      </form>
    </div>
  )
}
