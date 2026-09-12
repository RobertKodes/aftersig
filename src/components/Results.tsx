import { Copyable } from './Copyable'
import { toAgentExport, exportFilename } from '../lib/export'
import {
  downloadJson,
  formatBlockTime,
  formatCompute,
  formatDeltaLamports,
  formatFee,
  formatSlot,
  formatTokenAmount,
  lamportsToSol,
  rpcHost,
  signedTokenDelta,
  solscanAccount,
  solscanTx,
} from '../lib/format'
import type { DecodeFailure, DecodeResult } from '../lib/types'

export function FailureView({ failure }: { failure: DecodeFailure }) {
  if (failure.kind === 'invalid') {
    return (
      <section className="panel warn">
        <div className="panel-h">
          <h2>01 · input</h2>
        </div>
        <div className="panel-b">
          <p className="human">{failure.message}</p>
        </div>
      </section>
    )
  }

  if (failure.kind === 'not_found') {
    return (
      <section className="panel warn">
        <div className="panel-h">
          <h2>01 · not on this node</h2>
        </div>
        <div className="panel-b">
          <p className="human">
            RPC has no record of{' '}
            <Copyable value={failure.signature} compact={false} />. Typo, wrong
            cluster, or older than this node’s history. Official mainnet is
            picky with browser Origins — we hop, but some public nodes are
            shallow.
          </p>
          {failure.rpc ? (
            <p className="quiet">Last endpoint: {rpcHost(failure.rpc)}</p>
          ) : null}
        </div>
      </section>
    )
  }

  if (failure.kind === 'throttle') {
    return (
      <section className="panel warn">
        <div className="panel-h">
          <h2>01 · rpc waved us off</h2>
        </div>
        <div className="panel-b">
          <p className="human">
            {failure.message ||
              '403 / 429 from the public endpoints. Wait a beat, or set VITE_RPC_URL to an RPC that allows this Origin.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel bad">
      <div className="panel-h">
        <h2>01 · decode failed</h2>
      </div>
      <div className="panel-b">
        <p className="human">{failure.message}</p>
      </div>
    </section>
  )
}

export function IdleView() {
  return (
    <section className="panel mute">
      <div className="panel-h">
        <h2>00 · bench is empty</h2>
      </div>
      <div className="panel-b">
        <p className="human">
          Nothing decoded yet. Paste a signature and hit Decode — or grab a
          fresh public mainnet success via Sample.
        </p>
      </div>
    </section>
  )
}

export function ResultView({ result }: { result: DecodeResult }) {
  const time = formatBlockTime(result.blockTime)
  const ok = result.status === 'success'
  const payload = toAgentExport(result)

  return (
    <>
      <section className={ok ? 'panel ok' : 'panel bad'}>
        <div className="panel-h">
          <h2>01 · what landed</h2>
        </div>
        <div className="panel-b">
          <p className="lamp-row">
            <span className={ok ? 'lamp ok' : 'lamp bad'} />
            <span>{ok ? 'success' : 'failed'}</span>
          </p>
          <div className="sig-row">
            <Copyable value={result.signature} compact={false} />
            <a href={solscanTx(result.signature)} target="_blank" rel="noreferrer">
              solscan
            </a>
          </div>
          <dl className="meta-grid">
            <div className="kv">
              <dt>slot</dt>
              <dd>{formatSlot(result.slot)}</dd>
            </div>
            <div className="kv">
              <dt>time</dt>
              <dd>
                {time ? (
                  <>
                    {time.local}
                    <div className="quiet">{time.utc}</div>
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="kv">
              <dt>fee</dt>
              <dd>{formatFee(result.feeLamports)}</dd>
            </div>
            <div className="kv">
              <dt>compute</dt>
              <dd>{formatCompute(result.computeUnits, result.computeLimit)}</dd>
            </div>
            <div className="kv">
              <dt>rpc</dt>
              <dd title={result.rpc}>{rpcHost(result.rpc)}</dd>
            </div>
            <div className="kv">
              <dt>instructions</dt>
              <dd>
                {result.instructions.filter((i) => !i.inner).length} outer
                {result.instructions.some((i) => i.inner)
                  ? ` + ${result.instructions.filter((i) => i.inner).length} inner`
                  : ''}
              </dd>
            </div>
          </dl>
          {result.instructions.length === 0 ? (
            <p className="human">No instructions in the parsed message.</p>
          ) : (
            <ol className="ix-list">
              {result.instructions.map((ix) => (
                <li key={`${ix.index}-${ix.programId}`} className={ix.inner ? 'ix inner' : 'ix'}>
                  <div className="ix-idx">{String(ix.index).padStart(2, '0')}</div>
                  <div className="ix-body">
                    <div className="ix-prog">
                      <span className="ix-name">{ix.programLabel}</span>
                      {ix.type ? <span className="ix-type">{ix.type}</span> : null}
                      {ix.inner ? <span className="badge inner">inner</span> : null}
                    </div>
                    <div className="ix-sum">{ix.summary}</div>
                    <div className="sig-row">
                      <Copyable value={ix.programId} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className={result.compare ? panelForVerdict(result.compare.verdict) : 'panel mute'}>
        <div className="panel-h">
          <h2>02 · land vs intent</h2>
          {result.compare ? (
            <span className={`verdict ${result.compare.verdict}`}>{result.compare.verdict}</span>
          ) : null}
        </div>
        <div className="panel-b">
          {result.compare ? (
            <>
              {result.intent ? (
                <p className="human">
                  You wrote: <em>{result.intent}</em>
                </p>
              ) : null}
              <ul className="bullets">
                {result.compare.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="human">
              No intent given — skipped. Write what you (or your agent) asked
              for if you want a compare. Heuristic, not an LLM.
            </p>
          )}
        </div>
      </section>

      <section className={result.errors.length ? 'panel bad' : 'panel mute'}>
        <div className="panel-h">
          <h2>03 · human errors</h2>
        </div>
        <div className="panel-b">
          {result.errors.length === 0 ? (
            <p className="human">
              {ok
                ? 'No meta.err. Runtime did not attach a failure.'
                : 'Failed, but we could not map the error. Raw JSON below.'}
            </p>
          ) : (
            <ul className="err-list">
              {result.errors.map((err, i) => (
                <li key={`${err.code}-${i}`} className="err-item">
                  <div className="err-code">
                    {err.code}
                    {err.instructionIndex != null ? (
                      <span className="quiet"> · ix {err.instructionIndex}</span>
                    ) : null}
                    {err.guess ? <span className="guess">guess</span> : null}
                  </div>
                  <p className="err-msg">{err.message}</p>
                </li>
              ))}
            </ul>
          )}
          <details className="raw">
            <summary>raw err JSON</summary>
            <pre>{JSON.stringify(result.rawErr, null, 2)}</pre>
          </details>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>04 · balance / token deltas</h2>
        </div>
        <div className="panel-b">
          <p className="quiet">SOL pre / post / Δ per account in the message.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>account</th>
                  <th className="num">pre</th>
                  <th className="num">post</th>
                  <th className="num">Δ</th>
                </tr>
              </thead>
              <tbody>
                {result.balances.map((b) => (
                  <tr key={b.account}>
                    <td>
                      <span className="addr">
                        <Copyable value={b.account} />
                        <a href={solscanAccount(b.account)} target="_blank" rel="noreferrer">
                          solscan
                        </a>
                      </span>
                    </td>
                    <td className="num">{lamportsToSol(b.preLamports)}</td>
                    <td className="num">{lamportsToSol(b.postLamports)}</td>
                    <td className={`num ${deltaClass(b.deltaLamports)}`}>
                      {formatDeltaLamports(b.deltaLamports)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="quiet" style={{ marginTop: 16 }}>
            SPL token balances from meta.preTokenBalances / postTokenBalances.
          </p>
          {result.tokens.length === 0 ? (
            <p className="human">No token balance meta on this transaction.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>account</th>
                    <th>mint</th>
                    <th>owner</th>
                    <th className="num">pre</th>
                    <th className="num">post</th>
                    <th className="num">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.tokens.map((t) => (
                    <tr key={`${t.account}-${t.mint}`}>
                      <td>
                        <Copyable value={t.account} />
                      </td>
                      <td>
                        <Copyable value={t.mint} />
                      </td>
                      <td>{t.owner ? <Copyable value={t.owner} /> : '—'}</td>
                      <td className="num">{t.preUi ?? formatTokenAmount(t.preAmount, t.decimals)}</td>
                      <td className="num">{t.postUi ?? formatTokenAmount(t.postAmount, t.decimals)}</td>
                      <td className={`num ${deltaClass(Number(t.deltaAmount))}`}>
                        {signedTokenDelta(t.deltaAmount, t.decimals)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>05 · agent JSON</h2>
        </div>
        <div className="panel-b">
          <p className="human">
            Stable ingest blob: signature, status, intent, verdict, errors[],
            instructions[], balances[], tokens[], slot, blockTime, feeLamports,
            rpc.
          </p>
          <div className="export-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => downloadJson(exportFilename(result.signature), payload)}
            >
              download .json
            </button>
          </div>
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </section>
    </>
  )
}

function panelForVerdict(verdict: string): string {
  if (verdict === 'matched') return 'panel ok'
  if (verdict === 'partial') return 'panel warn'
  if (verdict === 'mismatch') return 'panel bad'
  return 'panel mute'
}

function deltaClass(n: number): string {
  if (n > 0) return 'pos'
  if (n < 0) return 'neg'
  return 'zero'
}
