/**
 * Reads the site-wide maintenance flag from a same-origin static file
 * (public/site-status.json). Every visitor's browser checks this — it's
 * the only way a static frontend with no backend of its own can be taken
 * down for everyone at once, not just the browser that flipped the switch.
 * Toggling it happens server-side only, via api/toggle-maintenance.js.
 */
export async function fetchMaintenanceFlag(): Promise<boolean> {
  try {
    const res = await fetch(`/site-status.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return false
    const data = (await res.json()) as { maintenance?: boolean }
    return Boolean(data.maintenance)
  } catch {
    return false
  }
}
