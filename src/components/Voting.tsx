import { useState } from 'react'
import { Select, Button } from '@khelahobe/kui'

interface VotingProps {
  gameCode: string
  playerId: string
  livingPlayers: Record<string, { name: string; alive?: boolean }>
  isHost: boolean
  canVote: boolean
}

export function Voting({ gameCode, playerId, livingPlayers, isHost, canVote }: VotingProps) {
  const [target, setTarget] = useState('')
  const [voteSubmitted, setVoteSubmitted] = useState(false)

  const options = Object.entries(livingPlayers)
    .filter(([id, p]) => id !== playerId && p.alive !== false)
    .map(([id, p]) => ({ value: id, label: p.name }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!isHost && (
        <>
          <Select
            options={[{ value: '', label: '-- Vote for --' }, ...options]}
            value={target}
            onChange={e => setTarget(e.target.value)}
            disabled={!canVote}
          />
          <Button
            variant="primary"
            disabled={!target || !canVote || voteSubmitted}
            onClick={async () => {
              const { setVote } = await import('../api/game')
              await setVote(gameCode, playerId, target)
              setVoteSubmitted(true)
            }}
          >
            {voteSubmitted ? '✅ Vote Submitted' : 'Submit Vote'}
          </Button>
        </>
      )}
      {isHost && (
        <Button
          variant="secondary"
          onClick={async () => {
            const { finalizeVote } = await import('../api/game')
            await finalizeVote(gameCode)
          }}
        >
          Finalize Vote
        </Button>
      )}
    </div>
  )
}
