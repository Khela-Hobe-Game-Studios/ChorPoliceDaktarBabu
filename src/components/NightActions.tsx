import { useState } from 'react'
import { Select, Button } from '@khelahobe/kui'
import { ActionPrompt } from '@khelahobe/kui/cpdb'
import type { CpdbRole } from '@khelahobe/kui/cpdb'

interface NightActionsProps {
  myRole: string
  gameCode: string
  playerId: string
  livingPlayers: Record<string, { name: string; alive?: boolean }>
  canAct: boolean
}

const ACTION_MESSAGE: Record<string, string> = {
  chor:   'Choose your victim for tonight.',
  daktar: 'Choose a player to save.',
  police: 'Investigate a player.',
}

const ACTION_SUBTEXT: Record<string, string> = {
  chor:   'Your target will be eliminated if no one saves them.',
  daktar: 'The saved player cannot be killed tonight.',
  police: 'You will learn if your target is the Chor.',
}

export function NightActions({ myRole, gameCode, playerId, livingPlayers, canAct }: NightActionsProps) {
  const [target, setTarget] = useState('')
  const [actionSubmitted, setActionSubmitted] = useState(false)

  if (!['chor', 'daktar', 'police'].includes(myRole)) {
    return (
      <ActionPrompt
        phase="night"
        role="babu"
        message="No action for your role tonight."
        subtext="Lay low and wait for dawn."
      />
    )
  }

  const options = Object.entries(livingPlayers)
    .filter(([id, p]) => p.alive !== false && !(myRole === 'chor' && id === playerId))
    .map(([id, p]) => ({ value: id, label: p.name }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ActionPrompt
        phase="night"
        role={myRole as CpdbRole}
        message={ACTION_MESSAGE[myRole]}
        subtext={ACTION_SUBTEXT[myRole]}
      />
      <Select
        options={[{ value: '', label: '-- Select Player --' }, ...options]}
        value={target}
        onChange={e => setTarget(e.target.value)}
        disabled={!canAct}
      />
      <Button
        variant="primary"
        disabled={!target || !canAct || actionSubmitted}
        onClick={async () => {
          const { setNightAction } = await import('../api/game')
          await setNightAction(gameCode, playerId, { type: myRole as 'chor' | 'daktar' | 'police', target })
          setActionSubmitted(true)
        }}
      >
        {actionSubmitted ? '✅ Action Submitted' : 'Confirm'}
      </Button>
    </div>
  )
}
