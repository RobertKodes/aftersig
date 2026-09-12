import { useMemo, useState, type FormEvent } from 'react'
import { FailureView, IdleView, ResultView } from './components/Results'
import { decodeSignature } from './lib/decode'
import { rpcHost } from './lib/format'
import { DEFAULT_RPCS } from './lib/rpc'
import { fetchSampleSignature } from './lib/sample'
import type { DecodeFailure, DecodeResult, HopEvent } from './lib/types'

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading'; note: string }
  | { kind: 'ready'; result: DecodeResult }
  | { kind: 'fail'; failure: DecodeFailure }

export default function App() {
  const [sig, setSig] = useState('')
  const [intent, setIntent] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [rpcNote, setRpcNote] = useState(DEFAULT_RPCS[0])

  const pinned = useMemo(() => rpcHost(rpcNote), [rpcNote])

  async function onDecode(event?: FormEvent) {
    event?.preventDefault()
    setPhase({ kind: 'loading', note: 'asking the RPC…' })
    const outcome = await decodeSignature(sig, intent, onHop)
    if (outcome.ok) {
      setRpcNote(outcome.result.rpc)
      setPhase({ kind: 'ready', result: outcome.result })
      return
    }
    setPhase({ kind: 'fail', failure: outcome.failure })
  }

  function onHop(event: HopEvent) {
    setRpcNote(event.to)
    setPhase({
      kind: 'loading',
      note: `${rpcHost(event.from)} waved us off (${event.status}). hopping to ${rpcHost(event.to)}…`,
    })
  }

  async function onSample() {
    setPhase({ kind: 'loading', note: 'grabbing a fresh public mainnet success…' })
    try {
      const sample = await fetchSampleSignature(onHop)
      setSig(sample.signature)
      setRpcNote(sample.rpc)
      setPhase({ kind: 'loading', note: 'got a sample — decoding…' })
      const outcome = await decodeSignature(sample.signature, intent, onHop)
      if (outcome.ok) {
        setRpcNote(outcome.result.rpc)
        setPhase({ kind: 'ready', result: outcome.result })
        return
      }
      setPhase({ kind: 'fail', failure: outcome.failure })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setPhase({
        kind: 'fail',
        failure: { kind: 'error', message, hops: [] },
      })
    }
  }

  const busy = phase.kind === 'loading'

  return (
    <div className="shell">
      <header className="mast">
        <div className="brand">
          <div className="wordmark">
            after<span>sig</span>
          </div>
          <p className="lede">
            Paste a Solana transaction signature. Optionally write what you (or
            your agent) meant to do. See what actually landed.
          </p>
        </div>
        <div className="rpc-chip" title={rpcNote}>
          rpc · {pinned}
        </div>
      </header>

      <section className="bench">
        <div className="bench-head">
          <span className="rail-label">workbench</span>
          <span className="quiet">v1 · no wallet · no signing</span>
        </div>
        <form className="form" onSubmit={onDecode}>
          <div className="field">
            <label htmlFor="sig">transaction signature</label>
            <input
              id="sig"
              type="text"
              name="signature"
              autoComplete="off"
              spellCheck={false}
              placeholder="5eyk…  (base58, ~88 chars)"
              value={sig}
              onChange={(e) => setSig(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="intent">intent — optional</label>
            <textarea
              id="intent"
              name="intent"
              placeholder="I / my agent asked for X — e.g. send SOL, swap USDC on Jupiter, create an ATA"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  void onDecode()
                }
              }}
            />
            <span className="hint">⌘/Ctrl + Enter to decode. Heuristic compare, not an LLM.</span>
          </div>
          <div className="actions">
            <button type="submit" className="btn primary" disabled={busy}>
              Decode
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => void onSample()}>
              Sample
            </button>
            {busy ? <span className="status-line">{phase.note}</span> : null}
          </div>
        </form>
      </section>

      <div className="results">
        {phase.kind === 'idle' ? <IdleView /> : null}
        {phase.kind === 'loading' ? (
          <section className="panel mute">
            <div className="panel-h">
              <h2>00 · working</h2>
            </div>
            <div className="panel-b">
              <p className="human">{phase.note}</p>
            </div>
          </section>
        ) : null}
        {phase.kind === 'fail' ? <FailureView failure={phase.failure} /> : null}
        {phase.kind === 'ready' ? <ResultView result={phase.result} /> : null}
      </div>

      <footer className="foot">
        <span>experimenting, learning. the one lab product.</span>
        <span>
          <a href="https://github.com/RobertKodes/aftersig">source</a>
          {' · '}
          <a href="https://robertkodes.github.io/aftersig/">live</a>
        </span>
      </footer>
    </div>
  )
}
