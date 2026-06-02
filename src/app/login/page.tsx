'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [magicSent, setMagicSent] = useState(false)

  const supabase = createClient()

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        window.location.href = '/dashboard'
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setError(error.message)
      } else {
        setMagicSent(true)
      }
    }
    setLoading(false)
  }

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  if (magicSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1220]">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-[#FB3D78]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#FB3D78]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#FEFEFE] mb-2">Check your email</h2>
          <p className="text-[#64748b] text-sm">We sent a confirmation link to <span className="text-[#FEFEFE]">{email}</span></p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#0B1220]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[#141D2C] border-r border-[#1e2d42]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FB3D78] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-[#FEFEFE] tracking-tight">Jerry Intelligence</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-[#FEFEFE] leading-tight mb-4">
            Know what Reddit<br />is saying about you.
          </h1>
          <p className="text-[#64748b] text-lg leading-relaxed">
            Real-time mention tracking, AI sentiment analysis, competitor share of voice, and response opportunities — all in one place.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { label: 'Mentions tracked', value: '12,847' },
              { label: 'Avg response time', value: '< 4 min' },
              { label: 'Trust score lift', value: '+34%' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between py-3 border-b border-[#1e2d42]">
                <span className="text-[#64748b] text-sm">{stat.label}</span>
                <span className="text-[#FEFEFE] font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[#64748b] text-xs">© {new Date().getFullYear()} Jerry. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-[#FB3D78] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-[#FEFEFE] tracking-tight">Jerry Intelligence</span>
          </div>

          <h2 className="text-2xl font-bold text-[#FEFEFE] mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-[#64748b] text-sm mb-8">
            {mode === 'login' ? 'Sign in to your workspace' : 'Start monitoring Reddit today'}
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-[#1e2d42] bg-[#111927] text-[#FEFEFE] text-sm font-medium hover:bg-[#16202f] hover:border-[#2a3d55] transition-colors disabled:opacity-50 mb-6"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#1e2d42]" />
            <span className="text-[#64748b] text-xs">or</span>
            <div className="flex-1 h-px bg-[#1e2d42]" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@jerry.com"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-[#111927] border border-[#1e2d42] text-[#FEFEFE] text-sm placeholder-[#475569] focus:outline-none focus:border-[#FB3D78] focus:ring-1 focus:ring-[#FB3D78]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full px-3 py-2.5 rounded-lg bg-[#111927] border border-[#1e2d42] text-[#FEFEFE] text-sm placeholder-[#475569] focus:outline-none focus:border-[#FB3D78] focus:ring-1 focus:ring-[#FB3D78]/30 transition-colors"
              />
            </div>

            {error && (
              <p className="text-[#f43f5e] text-xs bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg bg-[#FB3D78] text-white text-sm font-semibold hover:bg-[#f91f63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-[#64748b] mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
              className="text-[#FB3D78] hover:underline font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
