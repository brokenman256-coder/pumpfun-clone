import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import {
  adminLogin,
  clearAdminSession,
  isAdminSessionValid,
  signBotCommand,
} from '../lib/adminAuth'
import { FEE_RECIPIENT, CLUSTER, CHAIN_LABEL } from '../chain/config'
import { formatUsd, formatSol } from '../lib/format'

/**
 * Secure admin dashboard + master bot controls
 */
export function AdminPage() {
  const adminAuthed = useStore((s) => s.adminAuthed)
  const setAdminAuthed = useStore((s) => s.setAdminAuthed)
  const tokens = useStore((s) => s.tokens)
  const payments = useStore((s) => s.payments)
  const botConfig = useStore((s) => s.botConfig)
  const botLog = useStore((s) => s.botLog)
  const setBotEnabled = useStore((s) => s.setBotEnabled)
  const setBotInterval = useStore((s) => s.setBotInterval)
  const setBotFleet = useStore((s) => s.setBotFleet)
  const botTick = useStore((s) => s.botTick)
  const dexStatus = useStore((s) => s.dexStatus)
  const dexLastSync = useStore((s) => s.dexLastSync)

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cmdSig, setCmdSig] = useState('')

  useEffect(() => {
    if (isAdminSessionValid()) setAdminAuthed(true)
  }, [setAdminAuthed])

  function login() {
    const r = adminLogin(password)
    if (!r.ok) {
      setError(r.error || 'Denied')
      return
    }
    setAdminAuthed(true)
    setError('')
    setPassword('')
  }

  function logout() {
    clearAdminSession()
    setAdminAuthed(false)
    setBotEnabled(false)
  }

  function armFleet() {
    const ts = Date.now()
    const sig = signBotCommand('ARM_FLEET', ts)
    setCmdSig(sig)
    setBotEnabled(true)
  }

  if (!adminAuthed) {
    return (
      <div className="mx-auto max-w-sm px-3 py-16">
        <h1 className="text-center text-xl font-black">🛡️ Admin lock</h1>
        <p className="mt-2 text-center text-xs text-[#8b8d97]">
          Master bot access · rate-limited · session expires in 4h
        </p>
        <div className="mt-6 space-y-3 rounded-2xl border border-[#1f2028] bg-[#14151b] p-5">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="Admin key"
            className="w-full rounded-xl border border-[#26272e] bg-[#0e0f13] px-3 py-3 text-sm outline-none focus:border-[#86efac]/40"
          />
          {error && <p className="text-center text-xs text-[#f87171]">{error}</p>}
          <button
            type="button"
            onClick={login}
            className="w-full rounded-full bg-[#86efac] py-3 text-sm font-bold text-black"
          >
            Unlock dashboard
          </button>
          <p className="text-[10px] text-[#555]">
            Set <code className="text-[#8b8d97]">VITE_ADMIN_KEY</code> in env for production. Default
            dev key is for local only.
          </p>
        </div>
      </div>
    )
  }

  const live = tokens.filter((t) => t.source === 'dexscreener').length
  const bots = tokens.filter((t) => t.tags?.includes('bot-launch')).length
  const vol = tokens.reduce((a, t) => a + (t.volumeUsd || 0), 0)
  const payVol = payments.reduce((a, p) => a + p.amountSol, 0)

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black">Admin dashboard</h1>
          <p className="text-xs text-[#8b8d97]">
            Master control · {CHAIN_LABEL} · treasury {FEE_RECIPIENT.slice(0, 8)}…
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-[#26272e] px-4 py-1.5 text-xs text-[#f87171]"
        >
          Lock session
        </button>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Board tokens" value={String(tokens.length)} />
        <Kpi label="Dex live" value={String(live)} />
        <Kpi label="Bot launches" value={`${bots} / ${botConfig.fleetSize}`} />
        <Kpi label="Vol (board)" value={formatUsd(vol)} />
        <Kpi label="Gateway SOL" value={formatSol(payVol)} />
        <Kpi label="Payments" value={String(payments.length)} />
        <Kpi label="Dex status" value={dexStatus} />
        <Kpi
          label="Last sync"
          value={dexLastSync ? new Date(dexLastSync).toLocaleTimeString() : '—'}
        />
      </div>

      {/* Master bot */}
      <section className="mt-6 rounded-2xl border border-yellow-400/30 bg-[#1a1508] p-5">
        <h2 className="text-lg font-bold text-yellow-300">🤖 Master launch fleet</h2>
        <p className="mt-1 text-xs text-[#8b8d97]">
          Up to 100 in-app bots · 1 token each · every {botConfig.intervalMs / 1000}s · rich meme art +
          descriptions. <strong className="text-yellow-200/80">Does not auto-spend real mainnet keys</strong> —
          board simulation for demos. Real SPL mints require connected wallet on Create.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-[#8b8d97]">
            Fleet size (max 100)
            <input
              type="number"
              min={1}
              max={100}
              value={botConfig.fleetSize}
              onChange={(e) => setBotFleet(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-[#26272e] bg-[#0e0f13] px-2 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-[#8b8d97]">
            Interval (ms)
            <input
              type="number"
              min={5000}
              step={1000}
              value={botConfig.intervalMs}
              onChange={(e) => setBotInterval(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-[#26272e] bg-[#0e0f13] px-2 py-2 text-sm text-white"
            />
          </label>
          <div className="flex flex-col justify-end gap-2">
            <button
              type="button"
              onClick={armFleet}
              disabled={botConfig.enabled}
              className="rounded-full bg-[#86efac] py-2 text-sm font-bold text-black disabled:opacity-40"
            >
              {botConfig.enabled ? 'Fleet running…' : 'ARM fleet (signed)'}
            </button>
            <button
              type="button"
              onClick={() => setBotEnabled(false)}
              className="rounded-full border border-[#f87171]/40 py-2 text-sm font-bold text-[#f87171]"
            >
              STOP
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-black/40 px-2 py-1">
            launched {botConfig.launched}/{botConfig.fleetSize}
          </span>
          {cmdSig && (
            <span className="rounded-full bg-black/40 px-2 py-1 font-mono text-[10px]">
              cmd sig {cmdSig}
            </span>
          )}
          <button
            type="button"
            onClick={() => botTick()}
            className="rounded-full border border-[#26272e] px-2 py-1"
          >
            Force 1 launch
          </button>
        </div>

        <div className="mt-4 max-h-40 overflow-y-auto rounded-xl bg-black/40 p-3 font-mono text-[10px] text-[#8b8d97]">
          {botLog.length === 0 && <p>No bot events yet</p>}
          {botLog.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="mt-6 rounded-2xl border border-[#1f2028] bg-[#14151b] p-5">
        <h2 className="font-bold text-white">Security posture</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#8b8d97]">
          <li>Admin session in sessionStorage (4h expiry)</li>
          <li>Login rate-limit: 5 attempts → 60s lock</li>
          <li>Bot ARM signs command with admin key hash</li>
          <li>No private keys stored for the 100-bot fleet (sim launches only)</li>
          <li>Treasury {FEE_RECIPIENT} receives gateway fees only via user-signed txs</li>
          <li>Network: {CLUSTER}</li>
        </ul>
      </section>

      {/* Recent payments */}
      <section className="mt-6 rounded-2xl border border-[#1f2028] bg-[#14151b] p-5">
        <h2 className="font-bold">Gateway ledger</h2>
        <div className="mt-2 space-y-1 text-xs">
          {payments.length === 0 && <p className="text-[#6b6d78]">No payments yet</p>}
          {payments.slice(0, 15).map((p) => (
            <div key={p.signature} className="flex justify-between border-b border-[#1a1b22] py-1.5">
              <span>
                {p.amountSol} SOL · {p.purpose}
              </span>
              <span className="font-mono text-[#6b6d78]">{p.signature.slice(0, 12)}…</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#1f2028] bg-[#14151b] p-3">
      <p className="text-[10px] uppercase text-[#6b6d78]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
    </div>
  )
}
