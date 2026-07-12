/**
 * Creates real on-chain bonding-curve coins using real internet meme
 * images, pulled from safe/curated subreddits (never posts anything flagged
 * nsfw/spoiler by the source API). Every launch is a real transaction that
 * costs real SOL (create fee + rent) from BOT_WALLET_SECRET.
 *
 * Two modes, controlled by LOOP_BUDGET_MS:
 *  - Unset/0: single-shot — create one coin and exit (used by
 *    `workflow_dispatch` / manual runs).
 *  - Set: loop mode — create one coin every LOOP_INTERVAL_MS (default 10s)
 *    for up to LOOP_BUDGET_MS of wall-clock time, then exit cleanly. See
 *    .github/workflows/bot-launch.yml, which re-triggers a fresh run before
 *    the budget runs out so it's effectively continuous.
 *
 * Never repeats a meme image: before picking one, it reads every existing
 * on-chain BondingCurve account and treats every image URL already used by
 * a prior coin (bot- or user-created) as off-limits, then pulls a wide,
 * shuffled pool across all safe subreddits and picks a fresh one from
 * whatever's left. If every fetched candidate has already been used, it
 * skips that launch rather than posting a duplicate. In loop mode the
 * used-image set is cached in memory (refreshed periodically, not on every
 * single 10-second tick) so it doesn't re-fetch and re-decode every
 * on-chain account every 10 seconds.
 */
import { createHash } from 'node:crypto'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com'
const PROGRAM_ID = new PublicKey(
  process.env.LAUNCHPAD_PROGRAM_ID || 'AXgGrZTKV2FJWuVAaj5z36TNGWjJHLQwSkPSh5aLfsg8',
)
const FEE_RECIPIENT = new PublicKey(
  process.env.FEE_RECIPIENT || 'E9M6EVwNW8k6jogJ6PRmbeJUR6dhtPuDzWrWH71PwTAw',
)

// Only wholesome/crypto-culture subreddits — never the generic "memes" pool,
// to keep unattended, unmoderated posting low-risk.
const SAFE_SUBREDDITS = ['wholesomememes', 'cryptocurrencymemes', 'dogecoin', 'ProgrammerHumor']
const MEMES_PER_SUBREDDIT = 50

const LOOP_INTERVAL_MS = Number(process.env.LOOP_INTERVAL_MS || 10_000)
const LOOP_BUDGET_MS = Number(process.env.LOOP_BUDGET_MS || 0)
// Re-fetch the full on-chain used-image set every ~5 minutes of loop time
// instead of every 10s tick, so a long-running loop doesn't hammer the RPC
// with a full getProgramAccounts scan every single iteration.
const RESYNC_EVERY_MS = 5 * 60_000

const THEMES = [
  ['Based Frog', 'BFROG'],
  ['Degen Ape', 'DAPE'],
  ['Moon Rocket', 'MOONR'],
  ['Sol Cat', 'SCAT'],
  ['Diamond Paw', 'DPAW'],
  ['Giga Brain', 'GIGA'],
  ['Chaos Goblin', 'GOBL'],
  ['Pixel Pepe', 'PXPE'],
]

/** Turns a real meme title into a coin name, e.g. "Which one are you bringing to the table?" -> "Bringing To The Table". */
function nameFromTitle(title) {
  const words = title
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(a|an|the|is|are|to|of|in|on|for|and|or)$/i.test(w))
  const picked = words.slice(0, 4).join(' ')
  return picked.length >= 4 ? picked.slice(0, 28) : null
}

function symbolFromName(name) {
  const letters = name.replace(/[^a-zA-Z0-9]/g, '')
  return letters.slice(0, 8).toUpperCase() || 'MEME'
}

/** Packs image + a short blurb into the on-chain 200-byte uri field as compact JSON. */
function packUri(imageUrl, blurb) {
  if (!imageUrl) return ''
  const withBlurb = JSON.stringify({ i: imageUrl, t: blurb })
  if (withBlurb.length <= 200) return withBlurb
  const imageOnly = JSON.stringify({ i: imageUrl })
  return imageOnly.length <= 200 ? imageOnly : imageUrl.slice(0, 200)
}

function disc(name) {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}
function u16le(n) {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n)
  return b
}
function str(s) {
  const body = Buffer.from(s, 'utf8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(body.length)
  return Buffer.concat([len, body])
}
function loadKeypairFromEnv() {
  const raw = process.env.BOT_WALLET_SECRET
  if (!raw) throw new Error('BOT_WALLET_SECRET env var is not set')
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function readString(buf, offset) {
  const len = buf.readUInt32LE(offset)
  const value = buf.subarray(offset + 4, offset + 4 + len).toString('utf8')
  return [value, offset + 4 + len]
}

/** Pulls just the `uri` field out of a BondingCurve account (see program/lib.rs for the layout). */
function decodeUri(data) {
  let o = 8 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 1 + 2 + 1
  const [, o2] = readString(data, o) // name
  o = o2
  const [, o3] = readString(data, o) // symbol
  o = o3
  const [uri] = readString(data, o)
  return uri
}

/** Same uri encoding the frontend uses: a plain http(s) URL, or packed {"i":...,"t":...} JSON. */
function imageUrlFromUri(uri) {
  if (!uri) return null
  if (/^https?:\/\//i.test(uri)) return uri
  try {
    const parsed = JSON.parse(uri)
    return parsed.i || null
  } catch {
    return null
  }
}

/** Every meme image URL already used by any coin (bot- or user-created) already on-chain. */
async function fetchUsedImageUrls(connection) {
  const BONDING_CURVE_SIZE = 363
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: BONDING_CURVE_SIZE }],
    commitment: 'confirmed',
  })
  const used = new Set()
  for (const { account } of accounts) {
    try {
      const url = imageUrlFromUri(decodeUri(account.data))
      if (url) used.add(url)
    } catch {
      // skip anything that doesn't decode cleanly
    }
  }
  return used
}

async function fetchSafeCandidates(subreddit) {
  const res = await fetch(`https://meme-api.com/gimme/${subreddit}/${MEMES_PER_SUBREDDIT}`)
  if (!res.ok) throw new Error(`meme-api ${res.status} for r/${subreddit}`)
  const data = await res.json()
  return (data.memes || []).filter(
    (m) =>
      !m.nsfw &&
      !m.spoiler &&
      /^https:\/\/i\.redd\.it\/.+\.(png|jpe?g|webp)$/i.test(m.url) &&
      m.url.length <= 180,
  )
}

/** Picks a fresh (never-used) safe meme given an already-known used-image set. */
async function pickFreshMeme(used) {
  const pool = []
  for (const subreddit of shuffled(SAFE_SUBREDDITS)) {
    try {
      const candidates = await fetchSafeCandidates(subreddit)
      const fresh = candidates.filter((m) => !used.has(m.url))
      pool.push(...fresh)
    } catch (e) {
      console.warn(`Skipping r/${subreddit}:`, e.message)
    }
  }
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Creates exactly one coin. `used` is mutated with the newly-picked image on success. */
async function launchOnce(connection, bot, used) {
  let imageUrl = ''
  let memeTitle = ''
  const meme = await pickFreshMeme(used)
  if (!meme) {
    console.log(
      `${used.size} meme image(s) already used on-chain — every fetched candidate across all ` +
        'safe subreddits has already been used. Skipping this launch instead of posting a duplicate.',
    )
    return { launched: false }
  }
  imageUrl = meme.url
  memeTitle = meme.title
  console.log('Using fresh meme:', meme.title, '—', meme.url)

  // Name the coin after the actual meme so the art and name match — a random
  // unrelated theme name next to someone else's meme reads as low-effort spam.
  const seq = Math.floor(Math.random() * 10_000)
  const titleName = nameFromTitle(memeTitle)
  let name, symbol
  if (titleName) {
    name = titleName
    symbol = symbolFromName(titleName)
  } else {
    const [themeName, themeSymbol] = THEMES[Math.floor(Math.random() * THEMES.length)]
    name = `${themeName} #${seq}`
    symbol = `${themeSymbol}${seq % 100}`.slice(0, 8).toUpperCase()
  }
  const blurb = `Community coin inspired by a trending meme: "${memeTitle}"`.slice(0, 140)
  const uri = packUri(imageUrl, blurb)

  const mintKeypair = Keypair.generate()
  const mint = mintKeypair.publicKey
  const [curvePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    PROGRAM_ID,
  )
  const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID)
  const vaultAta = getAssociatedTokenAddressSync(mint, curvePda, true)
  const creatorAta = getAssociatedTokenAddressSync(mint, bot.publicKey)

  const data = Buffer.concat([disc('create_token'), str(name), str(symbol), str(uri)])
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: globalPda, isSigner: false, isWritable: false },
      { pubkey: curvePda, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: true, isWritable: true },
      { pubkey: vaultAta, isSigner: false, isWritable: true },
      { pubkey: creatorAta, isSigner: false, isWritable: true },
      { pubkey: bot.publicKey, isSigner: true, isWritable: true },
      { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  })

  const balance = await connection.getBalance(bot.publicKey)
  if (balance < 0.03 * 1e9) {
    throw new Error(
      `Bot wallet ${bot.publicKey.toBase58()} balance too low (${balance / 1e9} SOL) — fund it to keep this running.`,
    )
  }

  const tx = new Transaction().add(ix)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.feePayer = bot.publicKey
  tx.sign(bot, mintKeypair)
  const sig = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')

  console.log('Launched', name, `(${symbol})`)
  console.log('Mint:', mint.toBase58())
  console.log('Curve:', curvePda.toBase58())
  console.log('Signature:', sig)
  console.log('Meme title:', memeTitle)

  used.add(imageUrl)
  return { launched: true, imageUrl }
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed')
  const bot = loadKeypairFromEnv()

  if (!LOOP_BUDGET_MS) {
    const used = await fetchUsedImageUrls(connection)
    console.log(`${used.size} meme image(s) already used on-chain — excluding those.`)
    await launchOnce(connection, bot, used)
    return
  }

  console.log(
    `Loop mode: creating a coin every ${LOOP_INTERVAL_MS / 1000}s for up to ` +
      `${(LOOP_BUDGET_MS / 60_000).toFixed(0)} minutes.`,
  )
  const start = Date.now()
  let used = await fetchUsedImageUrls(connection)
  let lastResync = Date.now()
  let iter = 0
  let launchedCount = 0

  while (Date.now() - start < LOOP_BUDGET_MS) {
    iter++
    if (Date.now() - lastResync > RESYNC_EVERY_MS) {
      try {
        used = await fetchUsedImageUrls(connection)
        lastResync = Date.now()
        console.log(`[iter ${iter}] resynced used-image set from chain: ${used.size} known`)
      } catch (e) {
        console.warn(`[iter ${iter}] resync failed, keeping cached set:`, e.message)
      }
    }
    try {
      const result = await launchOnce(connection, bot, used)
      if (result.launched) launchedCount++
    } catch (e) {
      console.error(`[iter ${iter}] launch attempt failed (continuing loop):`, e.message)
      if (/balance too low|BOT_WALLET_SECRET/.test(e.message)) {
        console.error('Fatal for this run — stopping loop early.')
        break
      }
    }
    await sleep(LOOP_INTERVAL_MS)
  }
  console.log(`Loop finished: ${launchedCount} coin(s) launched across ${iter} attempt(s).`)
}

main().catch((e) => {
  console.error('Bot launch failed:', e)
  process.exit(1)
})
