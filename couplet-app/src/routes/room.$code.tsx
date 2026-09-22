// src/routes/room.$code.tsx
import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { getRoomState, joinRoomFn, makeMoveFn, resetGameFn } from '~/server/functions'
import type { Room } from '~/server/store'
import { loadIdentity, saveIdentity, type Identity } from '~/lib/identity'
import { Board } from '~/components/Board'

export const Route = createFileRoute('/room/$code')({
  component: RoomPage,
  loader: async ({ params }) => {
    try {
      const { room } = await getRoomState({ data: { code: params.code } })
      return { room, notFound: false as const }
    } catch {
      return { room: null, notFound: true as const }
    }
  },
})

const POLL_MS = 1500

function RoomPage() {
  const { code } = Route.useParams()
  const initial = Route.useLoaderData()

  const [room, setRoom] = useState<Room | null>(initial.room)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const identityRef = useRef<Identity | null>(null)

  useEffect(() => {
    const stored = loadIdentity(code)
    identityRef.current = stored
    setIdentity(stored)
  }, [code])

  // Poll for room state so both browsers stay in sync.
  useEffect(() => {
    if (!room) return
    const interval = setInterval(async () => {
      try {
        const { room: fresh } = await getRoomState({ data: { code } })
        setRoom(fresh)
      } catch {
        // room may have been cleared server-side; ignore transient errors
      }
    }, POLL_MS)
    return () => clearInterval(interval)
  }, [code, room !== null])

  if (initial.notFound && !room) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-2xl font-semibold">Room {code} doesn't exist.</p>
        <p className="mt-2 text-white/60">Double-check the code your partner sent you.</p>
        <Link to="/" className="mt-6 rounded-xl bg-fuchsia-500 px-5 py-2.5 font-semibold">
          Back home
        </Link>
      </main>
    )
  }

  if (!room) return null

  if (!identity) {
    return (
      <JoinPanel
        code={code}
        onJoined={(id, r) => {
          identityRef.current = id
          setIdentity(id)
          setRoom(r)
        }}
      />
    )
  }

  const me = identity.symbol
  const opponentSymbol = me === 'X' ? 'O' : 'X'
  const opponent = room.players[opponentSymbol]
  const waitingForPartner = room.status === 'waiting'
  const myTurn = room.game.turn === me && room.status === 'active' && !room.game.winner

  async function handleCellClick(index: number) {
    setMoveError(null)
    try {
      const { room: updated } = await makeMoveFn({ data: { code, symbol: me, index } })
      setRoom(updated)
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Could not make that move.')
    }
  }

  async function handleRematch() {
    const { room: updated } = await resetGameFn({ data: { code } })
    setRoom(updated)
  }

  const resultText =
    room.game.winner === 'draw'
      ? "It's a draw!"
      : room.game.winner === me
        ? 'You won! 🎉'
        : room.game.winner
          ? 'Your partner won this one 💜'
          : null

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-sm text-white/50 hover:text-white/80">
            ← Home
          </Link>
          <div className="text-sm text-white/50">
            Room <span className="font-mono tracking-widest text-white">{code}</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-5 sm:p-6 shadow-2xl">
          <PlayerRow you name={identity.name} symbol={me} active={myTurn} />
          <div className="my-3 flex items-center gap-3 text-white/30">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs">vs</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <PlayerRow
            you={false}
            name={opponent?.name ?? null}
            symbol={opponentSymbol}
            active={!waitingForPartner && room.game.turn === opponentSymbol && !room.game.winner}
          />

          {waitingForPartner ? (
            <div className="mt-6 text-center">
              <p className="text-white/70">Waiting for your partner to join…</p>
              <p className="mt-2 text-sm text-white/40">
                Share this code with them: <span className="font-mono text-white">{code}</span>
              </p>
              <div className="mt-4 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-fuchsia-400" />
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <Board
                board={room.game.board}
                disabled={!myTurn}
                onCellClick={handleCellClick}
              />
              <p className="mt-4 text-center text-sm h-5 text-white/60">
                {moveError
                  ? moveError
                  : resultText
                    ? resultText
                    : myTurn
                      ? "Your turn"
                      : "Partner's turn…"}
              </p>
              {room.game.winner && (
                <button
                  onClick={handleRematch}
                  className="mt-4 w-full rounded-xl bg-fuchsia-500 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:bg-fuchsia-400"
                >
                  Play again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function PlayerRow({
  you,
  name,
  symbol,
  active,
}: {
  you: boolean
  name: string | null
  symbol: 'X' | 'O'
  active: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl px-4 py-3 transition ${
        active ? 'bg-fuchsia-500/15 ring-1 ring-fuchsia-400/40' : 'bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${
            symbol === 'X' ? 'bg-sky-400/20 text-sky-300' : 'bg-pink-400/20 text-pink-300'
          }`}
        >
          {symbol}
        </span>
        <div>
          <p className="font-medium">{name ?? 'Waiting…'}</p>
          <p className="text-xs text-white/40">{you ? 'You' : 'Partner'}</p>
        </div>
      </div>
      {active && <span className="text-xs font-medium text-fuchsia-300">turn</span>}
    </div>
  )
}

function JoinPanel({
  code,
  onJoined,
}: {
  code: string
  onJoined: (identity: Identity, room: Room) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { room, playerId, symbol } = await joinRoomFn({ data: { code, name, email } })
      const identity: Identity = { playerId, symbol, name }
      saveIdentity(code, identity)
      onJoined(identity, room)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join that room.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-6 sm:p-8 shadow-2xl">
        <p className="text-center text-white/60 mb-1">You're joining room</p>
        <p className="text-center font-mono text-2xl tracking-[0.3em] mb-6">{code}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1" htmlFor="jname">
              Your name
            </label>
            <input
              id="jname"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-white placeholder-white/30 outline-none ring-1 ring-white/10 focus:ring-fuchsia-400"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1" htmlFor="jemail">
              Your email
            </label>
            <input
              id="jemail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-white placeholder-white/30 outline-none ring-1 ring-white/10 focus:ring-fuchsia-400"
            />
          </div>
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
            {loading ? 'Joining…' : 'Join room'}
          </button>
        </form>
      </div>
    </main>
  )
}
