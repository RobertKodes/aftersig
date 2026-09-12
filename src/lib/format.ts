const SOL = 1_000_000_000

export function trimSig(value: string): string {
  return value.trim().replace(/\s+/g, '')
}

export function isLikelySignature(value: string): boolean {
  const s = trimSig(value)
  if (s.length < 80 || s.length > 96) return false
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)
}

export function shortKey(key: string, head = 4, tail = 4): string {
  if (key.length <= head + tail + 1) return key
  return `${key.slice(0, head)}…${key.slice(-tail)}`
}

export function lamportsToSol(lamports: number): string {
  const sign = lamports < 0 ? '-' : ''
  const abs = Math.abs(lamports)
  const whole = Math.floor(abs / SOL)
  const frac = abs % SOL
  if (frac === 0) return `${sign}${whole.toLocaleString('en-US')} SOL`
  const fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '')
  return `${sign}${whole.toLocaleString('en-US')}.${fracStr} SOL`
}

export function formatDeltaLamports(delta: number): string {
  if (delta === 0) return '0'
  const sign = delta > 0 ? '+' : '−'
  return `${sign}${lamportsToSol(Math.abs(delta))}`
}

export function formatTokenAmount(amount: string, decimals: number): string {
  if (!/^-?\d+$/.test(amount)) return amount
  const neg = amount.startsWith('-')
  const digits = neg ? amount.slice(1) : amount
  if (decimals <= 0) {
    return `${neg ? '-' : ''}${Number(digits).toLocaleString('en-US')}`
  }
  const padded = digits.padStart(decimals + 1, '0')
  const whole = padded.slice(0, -decimals)
  const frac = padded.slice(-decimals).replace(/0+$/, '')
  const wholeFmt = Number(whole).toLocaleString('en-US')
  return `${neg ? '-' : ''}${wholeFmt}${frac ? `.${frac}` : ''}`
}

export function signedTokenDelta(delta: string, decimals: number): string {
  if (delta === '0' || delta === '') return '0'
  const neg = delta.startsWith('-')
  const body = formatTokenAmount(neg ? delta.slice(1) : delta, decimals)
  return `${neg ? '−' : '+'}${body}`
}

export function formatSlot(slot: number | null): string {
  if (slot == null) return '—'
  return slot.toLocaleString('en-US')
}

export function formatBlockTime(unix: number | null): { local: string; utc: string } | null {
  if (unix == null) return null
  const d = new Date(unix * 1000)
  if (Number.isNaN(d.getTime())) return null
  return {
    local: d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    utc: d.toISOString().replace('.000Z', 'Z'),
  }
}

export function formatFee(lamports: number | null): string {
  if (lamports == null) return '—'
  return `${lamportsToSol(lamports)} (${lamports.toLocaleString('en-US')} lamports)`
}

export function formatCompute(used: number | null, limit: number | null): string {
  if (used == null && limit == null) return 'not in this meta'
  if (used != null && limit != null) {
    return `${used.toLocaleString('en-US')} / ${limit.toLocaleString('en-US')} CU`
  }
  if (used != null) return `${used.toLocaleString('en-US')} CU`
  return `limit ${limit?.toLocaleString('en-US')} CU`
}

export function solscanTx(signature: string): string {
  return `https://solscan.io/tx/${signature}`
}

export function solscanAccount(key: string): string {
  return `https://solscan.io/account/${key}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function rpcHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
