import type {
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
} from '@solana/web3.js'
import { mergeErrors } from './errors'
import { formatTokenAmount, lamportsToSol, shortKey } from './format'
import { programLabel, COMPUTE_BUDGET } from './programs'
import type {
  BalanceDelta,
  DecodedInstruction,
  DecodeResult,
  TokenDelta,
} from './types'

type AnyIx = ParsedInstruction | PartiallyDecodedInstruction

function isParsed(ix: AnyIx): ix is ParsedInstruction {
  return 'parsed' in ix && ix.parsed != null
}

function pubkeyOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'toBase58' in value) {
    const fn = (value as { toBase58?: () => string }).toBase58
    if (typeof fn === 'function') return fn.call(value)
  }
  return String(value ?? '')
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value)
  return null
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function infoOf(parsed: unknown): Record<string, unknown> {
  if (parsed && typeof parsed === 'object' && 'info' in parsed) {
    const info = (parsed as { info?: unknown }).info
    if (info && typeof info === 'object') return info as Record<string, unknown>
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>
  }
  return {}
}

function typeOf(parsed: unknown): string | null {
  if (parsed && typeof parsed === 'object' && 'type' in parsed) {
    const t = (parsed as { type?: unknown }).type
    if (typeof t === 'string') return t
  }
  return null
}

function summarizeParsed(program: string, parsed: unknown): string {
  const type = typeOf(parsed)
  const info = infoOf(parsed)
  const from = shortKey(str(info.source) ?? str(info.authority) ?? str(info.from) ?? '')
  const to = shortKey(str(info.destination) ?? str(info.newAccount) ?? str(info.to) ?? '')

  switch (type) {
    case 'transfer': {
      const lamports = num(info.lamports)
      if (lamports != null) {
        return `Transferred ${lamportsToSol(lamports)}  ${from} → ${to}`
      }
      const amount = str(info.amount) ?? String(info.amount ?? '')
      return `Transferred ${amount} tokens  ${from} → ${to}`
    }
    case 'transferChecked': {
      const ui = info.tokenAmount as { uiAmountString?: string; decimals?: number; amount?: string } | undefined
      const shown =
        ui?.uiAmountString ??
        (ui?.amount && ui.decimals != null
          ? formatTokenAmount(ui.amount, ui.decimals)
          : str(info.amount) ?? '?')
      const mint = shortKey(str(info.mint) ?? '')
      return `Transferred ${shown} (checked, mint ${mint})  ${from} → ${to}`
    }
    case 'createAccount':
    case 'createAccountWithSeed':
      return `Created account ${to || shortKey(str(info.newAccount) ?? '')} funded with ${lamportsToSol(num(info.lamports) ?? 0)}`
    case 'allocate':
    case 'allocateWithSeed':
      return `Allocated ${num(info.space) ?? '?'} bytes on ${shortKey(str(info.account) ?? '')}`
    case 'assign':
    case 'assignWithSeed':
      return `Assigned ${shortKey(str(info.account) ?? '')} to ${shortKey(str(info.owner) ?? '')}`
    case 'advanceNonce':
      return `Advanced nonce ${shortKey(str(info.nonceAccount) ?? '')}`
    case 'withdrawFromNonce':
      return `Withdrew ${lamportsToSol(num(info.lamports) ?? 0)} from nonce ${shortKey(str(info.nonceAccount) ?? '')}`
    case 'initializeNonce':
      return `Initialized nonce account ${shortKey(str(info.nonceAccount) ?? '')}`
    case 'authorizeNonce':
      return `Authorized nonce ${shortKey(str(info.nonceAccount) ?? '')}`
    case 'initializeAccount':
    case 'initializeAccount2':
    case 'initializeAccount3':
      return `Initialized token account ${shortKey(str(info.account) ?? '')} for mint ${shortKey(str(info.mint) ?? '')}`
    case 'initializeMint':
    case 'initializeMint2':
      return `Initialized mint ${shortKey(str(info.mint) ?? '')} (${num(info.decimals) ?? '?'} decimals)`
    case 'mintTo':
    case 'mintToChecked':
      return `Minted ${str(info.amount) ?? '?'} to ${shortKey(str(info.account) ?? '')}`
    case 'burn':
    case 'burnChecked':
      return `Burned ${str(info.amount) ?? '?'} from ${shortKey(str(info.account) ?? '')}`
    case 'approve':
    case 'approveChecked':
      return `Approved ${shortKey(str(info.delegate) ?? '')} for ${str(info.amount) ?? '?'} from ${shortKey(str(info.account) ?? str(info.source) ?? '')}`
    case 'revoke':
      return `Revoked delegate on ${shortKey(str(info.account) ?? str(info.source) ?? '')}`
    case 'setAuthority':
      return `Set ${str(info.authorityType) ?? 'authority'} on ${shortKey(str(info.account) ?? str(info.mint) ?? '')}`
    case 'closeAccount':
      return `Closed ${shortKey(str(info.account) ?? '')} → leftover to ${shortKey(str(info.destination) ?? '')}`
    case 'syncNative':
      return `Synced native SOL wrapper ${shortKey(str(info.account) ?? '')}`
    case 'freezeAccount':
      return `Froze token account ${shortKey(str(info.account) ?? '')}`
    case 'thawAccount':
      return `Thawed token account ${shortKey(str(info.account) ?? '')}`
    case 'create':
    case 'createIdempotent':
      return `Created associated token account ${shortKey(str(info.account) ?? '')} for ${shortKey(str(info.wallet) ?? '')}`
    case 'recoverNested':
      return `Recovered nested ATA into ${shortKey(str(info.destination) ?? '')}`
    case 'setComputeUnitLimit':
      return `Set compute unit limit to ${(num(info.units) ?? 0).toLocaleString('en-US')}`
    case 'setComputeUnitPrice':
      return `Set priority fee to ${(num(info.microLamports) ?? 0).toLocaleString('en-US')} µ-lamports/CU`
    case 'requestHeapFrame':
      return `Requested heap frame of ${(num(info.bytes) ?? 0).toLocaleString('en-US')} bytes`
    case 'setLoadedAccountsDataSizeLimit':
      return `Set loaded-accounts data size limit to ${(num(info.accountsDataSizeLimit) ?? 0).toLocaleString('en-US')}`
    default:
      break
  }

  if (program.toLowerCase().includes('memo') || type === undefined) {
    if (typeof parsed === 'string') return `Memo: ${parsed}`
    if (typeof info.memo === 'string') return `Memo: ${info.memo}`
  }

  if (type) {
    const keys = Object.keys(info).slice(0, 4)
    const hint = keys.length ? ` (${keys.join(', ')})` : ''
    return `${type}${hint}`
  }

  if (typeof parsed === 'string') return parsed
  return 'Parsed instruction (see type)'
}

function decodeIx(
  ix: AnyIx,
  index: number,
  inner: boolean,
  outerIndex: number | null,
): DecodedInstruction {
  const programId = pubkeyOf(ix.programId)
  const label = ('program' in ix && typeof ix.program === 'string' && ix.program
    ? prettyProgramName(ix.program, programId)
    : programLabel(programId))

  if (isParsed(ix)) {
    const type = typeOf(ix.parsed)
    return {
      index,
      inner,
      outerIndex,
      programId,
      programLabel: label,
      type,
      summary: summarizeParsed(label, ix.parsed),
      parsed: ix.parsed,
    }
  }

  const data = 'data' in ix && typeof ix.data === 'string' ? ix.data : null
  const nAccounts = 'accounts' in ix && Array.isArray(ix.accounts) ? ix.accounts.length : 0
  return {
    index,
    inner,
    outerIndex,
    programId,
    programLabel: label,
    type: null,
    summary: `Unparsed call to ${label}${nAccounts ? ` · ${nAccounts} accounts` : ''}${data ? ` · data ${data.slice(0, 12)}${data.length > 12 ? '…' : ''}` : ''}`,
    parsed: null,
  }
}

function prettyProgramName(parsedName: string, programId: string): string {
  const known = programLabel(programId)
  if (known !== 'Unknown program') return known
  if (!parsedName || parsedName === 'unknown') return known
  return parsedName.replace(/\b\w/g, (c) => c.toUpperCase())
}

function accountKeys(tx: ParsedTransactionWithMeta): string[] {
  const keys = tx.transaction.message.accountKeys
  return keys.map((k) => {
    if (typeof k === 'string') return k
    if (k && typeof k === 'object' && 'pubkey' in k) return pubkeyOf(k.pubkey)
    return pubkeyOf(k)
  })
}

function balanceDeltas(tx: ParsedTransactionWithMeta): BalanceDelta[] {
  const keys = accountKeys(tx)
  const pre = tx.meta?.preBalances ?? []
  const post = tx.meta?.postBalances ?? []
  const out: BalanceDelta[] = []
  const n = Math.max(keys.length, pre.length, post.length)
  for (let i = 0; i < n; i++) {
    const account = keys[i] ?? `#${i}`
    const preLamports = pre[i] ?? 0
    const postLamports = post[i] ?? 0
    out.push({
      account,
      preLamports,
      postLamports,
      deltaLamports: postLamports - preLamports,
    })
  }
  return out
}

function tokenAmount(entry: {
  uiTokenAmount?: { amount?: string; decimals?: number; uiAmountString?: string | null }
}): { amount: string; decimals: number; ui: string | null } {
  const ui = entry.uiTokenAmount
  return {
    amount: ui?.amount ?? '0',
    decimals: ui?.decimals ?? 0,
    ui: ui?.uiAmountString ?? null,
  }
}

function bigIntSafe(value: string): bigint {
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

function tokenDeltas(tx: ParsedTransactionWithMeta): TokenDelta[] {
  const keys = accountKeys(tx)
  const pre = tx.meta?.preTokenBalances ?? []
  const post = tx.meta?.postTokenBalances ?? []
  const map = new Map<string, TokenDelta>()

  const keyOf = (accountIndex: number, mint: string) => `${accountIndex}:${mint}`

  for (const row of pre) {
    const amt = tokenAmount(row)
    const account = keys[row.accountIndex] ?? `#${row.accountIndex}`
    map.set(keyOf(row.accountIndex, row.mint), {
      account,
      mint: row.mint,
      owner: row.owner ?? null,
      programId: row.programId ?? null,
      decimals: amt.decimals,
      preAmount: amt.amount,
      postAmount: '0',
      deltaAmount: '0',
      preUi: amt.ui,
      postUi: null,
      deltaUi: null,
    })
  }

  for (const row of post) {
    const amt = tokenAmount(row)
    const k = keyOf(row.accountIndex, row.mint)
    const account = keys[row.accountIndex] ?? `#${row.accountIndex}`
    const existing = map.get(k)
    if (existing) {
      existing.postAmount = amt.amount
      existing.postUi = amt.ui
      existing.decimals = amt.decimals
      existing.owner = existing.owner ?? row.owner ?? null
      existing.programId = existing.programId ?? row.programId ?? null
    } else {
      map.set(k, {
        account,
        mint: row.mint,
        owner: row.owner ?? null,
        programId: row.programId ?? null,
        decimals: amt.decimals,
        preAmount: '0',
        postAmount: amt.amount,
        deltaAmount: '0',
        preUi: null,
        postUi: amt.ui,
        deltaUi: null,
      })
    }
  }

  for (const row of map.values()) {
    const delta = bigIntSafe(row.postAmount) - bigIntSafe(row.preAmount)
    row.deltaAmount = delta.toString()
    if (row.preUi != null || row.postUi != null) {
      row.deltaUi = formatTokenAmount(row.deltaAmount, row.decimals)
    }
  }

  return [...map.values()].sort((a, b) => {
    const da = bigIntSafe(a.deltaAmount)
    const db = bigIntSafe(b.deltaAmount)
    if (da === 0n && db !== 0n) return 1
    if (db === 0n && da !== 0n) return -1
    return 0
  })
}

function computeFromLogs(logs: string[] | null | undefined): {
  used: number | null
  limit: number | null
} {
  if (!logs?.length) return { used: null, limit: null }
  const re = /consumed (\d+) of (\d+) compute units/i
  let used: number | null = null
  let limit: number | null = null
  for (const line of logs) {
    const m = line.match(re)
    if (m) {
      used = Number(m[1])
      limit = Number(m[2])
    }
  }
  return { used, limit }
}

function computeLimitFromIxs(ixs: DecodedInstruction[]): number | null {
  for (const ix of ixs) {
    if (ix.programId === COMPUTE_BUDGET && ix.type === 'setComputeUnitLimit') {
      const parsed = ix.parsed
      const info = infoOf(parsed)
      const units = num(info.units)
      if (units != null) return units
    }
  }
  return null
}

export function parseTransaction(
  tx: ParsedTransactionWithMeta,
  signature: string,
  rpc: string,
  hops: string[],
  intent: string | null,
): Omit<DecodeResult, 'compare'> & { compare: null } {
  const messageIxs = tx.transaction.message.instructions as AnyIx[]
  const instructions: DecodedInstruction[] = []
  let running = 0

  const innerByOuter = new Map<number, AnyIx[]>()
  for (const group of tx.meta?.innerInstructions ?? []) {
    innerByOuter.set(group.index, group.instructions as AnyIx[])
  }

  messageIxs.forEach((ix, outerIndex) => {
    instructions.push(decodeIx(ix, running, false, null))
    running += 1
    const inners = innerByOuter.get(outerIndex) ?? []
    for (const inner of inners) {
      instructions.push(decodeIx(inner, running, true, outerIndex))
      running += 1
    }
  })

  const logs = tx.meta?.logMessages ?? []
  const fromLogs = computeFromLogs(logs)
  const metaUsed =
    tx.meta && 'computeUnitsConsumed' in tx.meta
      ? num((tx.meta as { computeUnitsConsumed?: unknown }).computeUnitsConsumed)
      : null

  const errors = mergeErrors(tx.meta?.err ?? null, logs)
  const failed = tx.meta?.err != null

  return {
    signature,
    status: failed ? 'failed' : 'success',
    slot: tx.slot ?? null,
    blockTime: tx.blockTime ?? null,
    feeLamports: tx.meta?.fee ?? null,
    computeUnits: metaUsed ?? fromLogs.used,
    computeLimit: computeLimitFromIxs(instructions) ?? fromLogs.limit,
    rpc,
    hops,
    logs,
    instructions,
    balances: balanceDeltas(tx),
    tokens: tokenDeltas(tx),
    errors,
    rawErr: tx.meta?.err ?? null,
    intent,
    compare: null,
  }
}
