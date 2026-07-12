/**
 * Creates one real on-chain bonding-curve coin using a real internet meme
 * image, pulled from safe/curated subreddits (never posts anything flagged
 * nsfw/spoiler by the source API). Meant to run on a schedule (see
 * .github/workflows/bot-launch.yml) — every run is a real transaction that
 * costs real SOL (create fee + rent) from BOT_WALLET_SECRET.
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

async function fetchSafeMeme() {
  const subreddit = SAFE_SUBREDDITS[Math.floor(Math.random() * SAFE_SUBREDDITS.length)]
  const res = await fetch(`https://meme-api.com/gimme/${subreddit}/20`)
  if (!res.ok) throw new Error(`meme-api ${res.status}`)
  const data = await res.json()
  const candidates = (data.memes || []).filter(
    (m) => !m.nsfw && !m.spoiler && /^https:\/\/i\.redd\.it\//.test(m.url) && m.url.length <= 180,
  )
  if (candidates.length === 0) throw new Error('no safe memes found')
  return candidates[Math.floor(Math.random() * candidates.length)]
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed')
  const bot = loadKeypairFromEnv()

  let imageUrl = ''
  let memeTitle = ''
  try {
    const meme = await fetchSafeMeme()
    imageUrl = meme.url
    memeTitle = meme.title
    console.log('Using meme:', meme.title, '—', meme.url)
  } catch (e) {
    console.warn('Meme fetch failed, launching without a real image this run:', e.message)
  }

  const [themeName, themeSymbol] = THEMES[Math.floor(Math.random() * THEMES.length)]
  const seq = Math.floor(Math.random() * 10_000)
  const name = `${themeName} #${seq}`
  const symbol = `${themeSymbol}${seq % 100}`.slice(0, 8).toUpperCase()

  const mintKeypair = Keypair.generate()
  const mint = mintKeypair.publicKey
  const [curvePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    PROGRAM_ID,
  )
  const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID)
  const vaultAta = getAssociatedTokenAddressSync(mint, curvePda, true)
  const creatorAta = getAssociatedTokenAddressSync(mint, bot.publicKey)

  const data = Buffer.concat([disc('create_token'), str(name), str(symbol), str(imageUrl)])
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
  if (memeTitle) console.log('Meme title:', memeTitle)
}

main().catch((e) => {
  console.error('Bot launch failed:', e)
  process.exit(1)
})
