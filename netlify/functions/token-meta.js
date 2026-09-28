/**
 * Metaplex JSON for house mints so Phantom can show name + image.
 * GET /api/token-meta?mint=
 */
import { readBoard } from './lib/boardStore.js'

export const config = { path: '/api/token-meta' }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  const url = new URL(req.url)
  const mint = url.searchParams.get('mint') || ''
  if (mint.length < 32) return json({ error: 'mint required' }, 400)
  const { board } = await readBoard()
  const token = (board.tokens || []).find((t) => t.mint === mint || t.id === mint)
  const name = (token?.name || 'NOVA').slice(0, 32)
  const symbol = (token?.symbol || 'NOVA').slice(0, 10)
  const image = token?.imageUrl || 'https://nova-memecoin-launch.netlify.app/img/nova-mark.jpg'
  return json({
    name,
    symbol,
    description: token?.description || `${name} listed on NOVA.`,
    image,
    external_url: 'https://nova-memecoin-launch.netlify.app',
  })
}
