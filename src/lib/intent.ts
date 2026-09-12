import { isSwapProgram, isTokenProgram } from './programs'
import type { DecodedInstruction, IntentCompare, Verdict } from './types'

type Rule = {
  id: string
  label: string
  keys: string[]
  match: (ix: DecodedInstruction) => boolean
}

const RULES: Rule[] = [
  {
    id: 'swap',
    label: 'a swap / route (Jupiter, Raydium, Orca, …)',
    keys: ['swap', 'route', 'jupiter', 'raydium', 'orca', 'trade', 'exchange', 'quote'],
    match: (ix) =>
      isSwapProgram(ix.programId) ||
      /swap|route|exchange/i.test(`${ix.type ?? ''} ${ix.summary} ${ix.programLabel}`),
  },
  {
    id: 'sol-transfer',
    label: 'a native SOL transfer',
    keys: ['send sol', 'transfer sol', 'pay sol', 'tip sol', 'sol transfer', 'lamports'],
    match: (ix) =>
      ix.programLabel === 'System' && (ix.type === 'transfer' || /transferred .+ sol/i.test(ix.summary)),
  },
  {
    id: 'token-transfer',
    label: 'an SPL token transfer',
    keys: [
      'spl',
      'usdc',
      'usdt',
      'token transfer',
      'send token',
      'send usdc',
      'send usdt',
      'transfer token',
    ],
    match: (ix) =>
      isTokenProgram(ix.programId) &&
      (ix.type === 'transfer' || ix.type === 'transferChecked'),
  },
  {
    id: 'transfer',
    label: 'a transfer (SOL or token)',
    keys: ['transfer', 'send', 'pay', 'tip', 'payout'],
    match: (ix) =>
      ix.type === 'transfer' ||
      ix.type === 'transferChecked' ||
      /transferred /i.test(ix.summary),
  },
  {
    id: 'ata',
    label: 'create an associated token account',
    keys: ['ata', 'associated token', 'create token account', 'create ata'],
    match: (ix) =>
      ix.programLabel === 'Associated Token' ||
      ix.type === 'create' ||
      ix.type === 'createIdempotent',
  },
  {
    id: 'create-account',
    label: 'create / allocate an account',
    keys: ['create account', 'allocate', 'new account'],
    match: (ix) =>
      ix.type === 'createAccount' ||
      ix.type === 'createAccountWithSeed' ||
      ix.type === 'allocate' ||
      ix.type === 'allocateWithSeed',
  },
  {
    id: 'mint',
    label: 'mint tokens',
    keys: ['mint to', 'mint tokens', 'mint nft'],
    match: (ix) => ix.type === 'mintTo' || ix.type === 'mintToChecked',
  },
  {
    id: 'burn',
    label: 'burn tokens',
    keys: ['burn'],
    match: (ix) => ix.type === 'burn' || ix.type === 'burnChecked',
  },
  {
    id: 'close',
    label: 'close an account / reclaim rent',
    keys: ['close account', 'reclaim', 'close ata', 'reclaim rent'],
    match: (ix) => ix.type === 'closeAccount' || /closed /i.test(ix.summary),
  },
  {
    id: 'approve',
    label: 'approve a delegate',
    keys: ['approve', 'delegate'],
    match: (ix) => ix.type === 'approve' || ix.type === 'approveChecked',
  },
  {
    id: 'revoke',
    label: 'revoke a delegate',
    keys: ['revoke'],
    match: (ix) => ix.type === 'revoke',
  },
  {
    id: 'memo',
    label: 'attach a memo',
    keys: ['memo', 'note', 'message'],
    match: (ix) => ix.programLabel.startsWith('Memo') || /^memo:/i.test(ix.summary),
  },
  {
    id: 'priority',
    label: 'set a priority fee / compute budget',
    keys: ['priority fee', 'compute budget', 'cu limit', 'compute unit'],
    match: (ix) =>
      ix.programLabel === 'Compute Budget' ||
      ix.type === 'setComputeUnitLimit' ||
      ix.type === 'setComputeUnitPrice',
  },
  {
    id: 'stake',
    label: 'a stake program action',
    keys: ['stake', 'delegate stake', 'deactivate', 'withdraw stake'],
    match: (ix) => ix.programLabel === 'Stake',
  },
  {
    id: 'nft',
    label: 'an NFT / metadata action',
    keys: ['nft', 'metaplex', 'candy machine', 'cnft', 'compressed nft'],
    match: (ix) =>
      /metaplex|candy|bubblegum|tensor|magic eden/i.test(ix.programLabel),
  },
  {
    id: 'jupiter',
    label: 'a Jupiter call',
    keys: ['jupiter', 'jup'],
    match: (ix) => /jupiter/i.test(ix.programLabel),
  },
]

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function firedRules(intent: string): Rule[] {
  const n = normalize(intent)
  if (!n) return []
  const hit: Rule[] = []
  for (const rule of RULES) {
    if (rule.keys.some((k) => n.includes(k))) hit.push(rule)
  }
  const ids = new Set(hit.map((r) => r.id))
  if (ids.has('sol-transfer') || ids.has('token-transfer')) {
    return hit.filter((r) => r.id !== 'transfer')
  }
  if (ids.has('jupiter') && ids.has('swap')) {
    return hit.filter((r) => r.id !== 'jupiter')
  }
  return hit
}

export function compareIntent(
  intent: string | null | undefined,
  instructions: DecodedInstruction[],
  status: 'success' | 'failed' | 'not_found',
): IntentCompare | null {
  const raw = intent?.trim() ?? ''
  if (!raw) return null

  const meaningful = instructions.filter((ix) => ix.programLabel !== 'Compute Budget')
  const pool = meaningful.length ? meaningful : instructions
  const rules = firedRules(raw)

  if (rules.length === 0) {
    const programs = unique(instructions.map((ix) => ix.programLabel))
    const types = unique(instructions.filter((ix) => ix.type).map((ix) => ix.type as string))
    return {
      verdict: 'unclear',
      matchedRules: [],
      missedRules: [],
      bullets: [
        'Guess: I could not map that intent onto a known action (transfer, swap, mint, ATA, memo, …).',
        programs.length
          ? `What landed called: ${programs.join(', ')}${types.length ? ` · types ${types.join(', ')}` : ''}.`
          : 'No instructions to compare.',
        'Write a plainer ask if you want a tighter compare — e.g. “send SOL”, “swap USDC”, “create ATA”.',
      ],
    }
  }

  const matched: Rule[] = []
  const missed: Rule[] = []
  for (const rule of rules) {
    if (pool.some(rule.match) || instructions.some(rule.match)) matched.push(rule)
    else missed.push(rule)
  }

  let verdict: Verdict
  if (matched.length === rules.length && missed.length === 0) {
    verdict = status === 'failed' ? 'partial' : 'matched'
  } else if (matched.length === 0) {
    verdict = 'mismatch'
  } else {
    verdict = 'partial'
  }

  const bullets: string[] = []
  if (verdict === 'matched') {
    bullets.push(`Looks like a match. Intent pointed at ${andList(matched.map((r) => r.label))}.`)
  } else if (verdict === 'partial' && status === 'failed' && missed.length === 0) {
    bullets.push(
      `Guess: the instruction set matches ${andList(matched.map((r) => r.label))}, but the transaction failed — it did not actually land.`,
    )
  } else if (verdict === 'partial') {
    if (matched.length) {
      bullets.push(`Partial. I can see ${andList(matched.map((r) => r.label))}.`)
    }
    if (missed.length) {
      bullets.push(`I do not see ${andList(missed.map((r) => r.label))} in the parsed instructions.`)
    }
  } else {
    bullets.push(
      `Mismatch (guess). Intent looks like ${andList(missed.map((r) => r.label))}, but the parsed calls do not include those.`,
    )
  }

  const extras = unique(
    pool
      .filter((ix) => !rules.some((r) => r.match(ix)))
      .filter((ix) => ix.programLabel !== 'Compute Budget')
      .map((ix) => ix.programLabel),
  )
  if (extras.length) {
    bullets.push(`Also on-chain: ${extras.join(', ')}.`)
  }
  if (status === 'failed' && verdict === 'mismatch') {
    bullets.push('The transaction also failed, so nothing intended actually landed.')
  }
  bullets.push('Heuristic only — keyword vs program/type. Label guesses as guesses.')

  return {
    verdict,
    bullets,
    matchedRules: matched.map((r) => r.id),
    missedRules: missed.map((r) => r.id),
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function andList(items: string[]): string {
  if (items.length === 0) return 'nothing I recognize'
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}
