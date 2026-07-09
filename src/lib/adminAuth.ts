/**
 * Master bot / admin security layer (client-side gate + session).
 * Production: set VITE_ADMIN_KEY in env. Default dev key for local only.
 */
const SESSION_KEY = 'pump_admin_session_v1'
const MAX_ATTEMPTS = 5
const LOCK_MS = 60_000

const DEV_FALLBACK = 'pump-master-2026'

export function getAdminKey(): string {
  return (import.meta.env.VITE_ADMIN_KEY as string) || DEV_FALLBACK
}

export function isAdminSessionValid(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const { exp, ok } = JSON.parse(raw) as { exp: number; ok: boolean }
    return ok && Date.now() < exp
  } catch {
    return false
  }
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* */
  }
}

export function adminLogin(password: string): { ok: boolean; error?: string } {
  const lockUntil = Number(sessionStorage.getItem('pump_admin_lock') || 0)
  if (Date.now() < lockUntil) {
    return { ok: false, error: 'Locked. Try again in a minute.' }
  }
  const attempts = Number(sessionStorage.getItem('pump_admin_attempts') || 0)
  if (password !== getAdminKey()) {
    const next = attempts + 1
    sessionStorage.setItem('pump_admin_attempts', String(next))
    if (next >= MAX_ATTEMPTS) {
      sessionStorage.setItem('pump_admin_lock', String(Date.now() + LOCK_MS))
      sessionStorage.setItem('pump_admin_attempts', '0')
      return { ok: false, error: 'Too many attempts — locked 60s' }
    }
    return { ok: false, error: `Invalid key (${MAX_ATTEMPTS - next} left)` }
  }
  sessionStorage.setItem('pump_admin_attempts', '0')
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ ok: true, exp: Date.now() + 4 * 60 * 60 * 1000 }),
  )
  return { ok: true }
}

/** Simple integrity stamp for bot commands */
export function signBotCommand(cmd: string, ts: number): string {
  const key = getAdminKey()
  let h = 0
  const s = `${cmd}:${ts}:${key}`
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(16)
}

export function verifyBotCommand(cmd: string, ts: number, sig: string): boolean {
  if (Math.abs(Date.now() - ts) > 30_000) return false
  return signBotCommand(cmd, ts) === sig
}
