import { useState } from 'react'
import { copyText, shortKey } from '../lib/format'

type Props = {
  value: string
  label?: string
  compact?: boolean
}

export function Copyable({ value, label, compact = true }: Props) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')

  async function onCopy() {
    const ok = await copyText(value)
    setState(ok ? 'ok' : 'fail')
    window.setTimeout(() => setState('idle'), 1400)
  }

  return (
    <span className="addr">
      <span title={value}>{label ?? (compact ? shortKey(value) : value)}</span>
      <button type="button" className="copyish" onClick={onCopy}>
        {state === 'ok' ? 'copied' : state === 'fail' ? 'copy failed' : 'copy'}
      </button>
    </span>
  )
}
