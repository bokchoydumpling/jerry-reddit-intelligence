'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Competitor {
  id: string
  name: string
  keywords: string[]
  color: string
  active: boolean
}

export default function CompetitorManager({
  competitors, userId
}: { competitors: Competitor[]; userId: string }) {
  const [name, setName] = useState('')
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function addCompetitor(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    await fetch('/api/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      }),
    })

    setName('')
    setKeywords('')
    setLoading(false)
    router.refresh()
  }

  async function removeCompetitor(id: string) {
    await fetch(`/api/competitors/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[#FEFEFE] mb-4">Manage Competitors</h3>

      <div className="space-y-2 mb-5">
        {competitors.length === 0 ? (
          <p className="text-xs text-[#475569]">No competitors added yet.</p>
        ) : (
          competitors.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#1e2d42]">
              <div>
                <div className="text-sm text-[#FEFEFE]">{c.name}</div>
                <div className="text-xs text-[#64748b]">{c.keywords.join(', ')}</div>
              </div>
              <button
                onClick={() => removeCompetitor(c.id)}
                className="text-xs text-[#f43f5e] hover:underline"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addCompetitor} className="space-y-3">
        <div>
          <label className="block text-xs text-[#64748b] mb-1">Competitor name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Root Insurance"
            className="w-full px-3 py-2 rounded-lg bg-[#141D2C] border border-[#1e2d42] text-sm text-[#FEFEFE] placeholder-[#475569] focus:outline-none focus:border-[#FB3D78] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-[#64748b] mb-1">Keywords (comma-separated)</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="root, root insurance, rootcar"
            className="w-full px-3 py-2 rounded-lg bg-[#141D2C] border border-[#1e2d42] text-sm text-[#FEFEFE] placeholder-[#475569] focus:outline-none focus:border-[#FB3D78] transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-2 rounded-lg bg-[#FB3D78] text-white text-sm font-semibold hover:bg-[#f91f63] transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding…' : 'Add Competitor'}
        </button>
      </form>
    </div>
  )
}
