// src/routes/index.tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createRoomFn, joinRoomFn } from '~/server/functions'
import { saveIdentity } from '~/lib/identity'

export const Route = createFileRoute('/')({
  component: Home,
})

type Mode = 'create' | 'join'

function Home() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('create')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'create') {
        const { room, playerId, symbol } = await createRoomFn({ data: { name, email } })
        saveIdentity(room.code, { playerId, symbol, name })
        navigate({ to: '/room/$code', params: { code: room.code } })
      } else {
        const { room, playerId, symbol } = await joinRoomFn({
          data: { code, name, email },
        })
        saveIdentity(room.code, { playerId, symbol, name })
        navigate({ to: '/room/$code', params: { code: room.code } })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💞</div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Couplet</h1>
          <p className="mt-2 text-white/60">
            A tiny tic-tac-toe room for two — wherever you both are.
          </p>
        </div>

        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-6 sm:p-8 shadow-2xl">
          <div className="flex rounded-full bg-white/5 p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                mode === 'create' ? 'bg-fuchsia-500 text-white shadow' : 'text-white/60'
              }`}
            >
              Start a room
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                mode === 'join' ? 'bg-fuchsia-500 text-white shadow' : 'text-white/60'
              }`}
            >
              Join with a code
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1" htmlFor="name">
                Your name
              </label>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-white placeholder-white/30 outline-none ring-1 ring-white/10 focus:ring-fuchsia-400"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1" htmlFor="email">
                Your email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-white placeholder-white/30 outline-none ring-1 ring-white/10 focus:ring-fuchsia-400"
              />
              <p className="mt-1 text-xs text-white/40">
                Used so your partner knows who they're connected to — never shown publicly.
              </p>
            </div>

            {mode === 'join' && (
              <div>
                <label className="block text-sm text-white/70 mb-1" htmlFor="code">
                  Room code
                </label>
                <input
                  id="code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="AB12CD"
                  maxLength={6}
                  className="w-full rounded-xl bg-white/10 px-4 py-2.5 tracking-[0.3em] uppercase text-white placeholder-white/30 outline-none ring-1 ring-white/10 focus:ring-fuchsia-400"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-fuchsia-500 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:bg-fuchsia-400 disabled:opacity-50"
            >
              {loading
                ? 'One sec…'
                : mode === 'create'
                  ? 'Create room & get a code'
                  : 'Join room'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          Creating a room gives you a 6-character code — send it to your partner
          however you two usually talk, and they can join from any device.
        </p>
      </div>
    </main>
  )
}
