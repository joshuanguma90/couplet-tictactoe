// src/lib/identity.ts
//
// The server is the source of truth for game state, but each browser still
// needs to remember "which of the two players am I in this room" across
// refreshes. That's a per-device UI convenience, not shared game data, so
// plain localStorage is the right tool for it.

export type Identity = {
  playerId: string
  symbol: 'X' | 'O'
  name: string
}

function key(code: string) {
  return `couplet:room:${code}`
}

export function saveIdentity(code: string, identity: Identity) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key(code), JSON.stringify(identity))
  } catch {
    // ignore (e.g. private browsing quota)
  }
}

export function loadIdentity(code: string): Identity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key(code))
    return raw ? (JSON.parse(raw) as Identity) : null
  } catch {
    return null
  }
}

export function clearIdentity(code: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key(code))
}
