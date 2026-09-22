// src/components/Board.tsx
import type { Symbol as GameSymbol } from '~/server/store'

type BoardProps = {
  board: (GameSymbol | null)[]
  onCellClick: (index: number) => void
  disabled: boolean
  highlightLine?: number[] | null
}

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function findWinningLine(board: (GameSymbol | null)[]): number[] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line
  }
  return null
}

export function Board({ board, onCellClick, disabled }: BoardProps) {
  const winLine = findWinningLine(board)

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm mx-auto aspect-square">
      {board.map((cell, i) => {
        const isWinningCell = winLine?.includes(i)
        return (
          <button
            key={i}
            type="button"
            disabled={disabled || cell !== null}
            onClick={() => onCellClick(i)}
            className={[
              'flex items-center justify-center rounded-2xl text-4xl sm:text-5xl font-bold transition-all',
              'aspect-square select-none',
              isWinningCell
                ? 'bg-fuchsia-500/30 ring-2 ring-fuchsia-300'
                : 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10',
              !disabled && cell === null ? 'cursor-pointer active:scale-95' : 'cursor-default',
              cell === 'X' ? 'text-sky-300' : cell === 'O' ? 'text-pink-300' : 'text-white/20',
            ].join(' ')}
          >
            {cell ?? ''}
          </button>
        )
      })}
    </div>
  )
}
