export type TxStatus = 'success' | 'failed' | 'not_found'

export type Verdict = 'matched' | 'partial' | 'mismatch' | 'unclear'

export type DecodedInstruction = {
  index: number
  inner: boolean
  outerIndex: number | null
  programId: string
  programLabel: string
  type: string | null
  summary: string
  parsed: unknown | null
}

export type BalanceDelta = {
  account: string
  preLamports: number
  postLamports: number
  deltaLamports: number
}

export type TokenDelta = {
  account: string
  mint: string
  owner: string | null
  programId: string | null
  decimals: number
  preAmount: string
  postAmount: string
  deltaAmount: string
  preUi: string | null
  postUi: string | null
  deltaUi: string | null
}

export type HumanError = {
  source: 'transaction' | 'instruction' | 'anchor' | 'log' | 'unknown'
  code: string
  message: string
  guess: boolean
  instructionIndex: number | null
  raw: unknown
}

export type IntentCompare = {
  verdict: Verdict
  bullets: string[]
  matchedRules: string[]
  missedRules: string[]
}

export type DecodeResult = {
  signature: string
  status: TxStatus
  slot: number | null
  blockTime: number | null
  feeLamports: number | null
  computeUnits: number | null
  computeLimit: number | null
  rpc: string
  hops: string[]
  logs: string[]
  instructions: DecodedInstruction[]
  balances: BalanceDelta[]
  tokens: TokenDelta[]
  errors: HumanError[]
  rawErr: unknown
  intent: string | null
  compare: IntentCompare | null
}

/** Stable agent-ingest schema. Keep field names. */
export type AgentExport = {
  signature: string
  status: TxStatus
  intent: string | null
  verdict: Verdict | null
  errors: Array<{
    source: HumanError['source']
    code: string
    message: string
    guess: boolean
    instructionIndex: number | null
    raw: unknown
  }>
  instructions: Array<{
    index: number
    inner: boolean
    program: string
    programId: string
    type: string | null
    summary: string
  }>
  balances: BalanceDelta[]
  tokens: TokenDelta[]
  slot: number | null
  blockTime: number | null
  feeLamports: number | null
  rpc: string
}

export type HopEvent = {
  from: string
  status: number
  to: string
}

export type DecodeFailure =
  | { kind: 'invalid'; message: string }
  | { kind: 'not_found'; signature: string; rpc: string; hops: string[] }
  | { kind: 'throttle'; message: string; hops: string[] }
  | { kind: 'error'; message: string; hops: string[] }
