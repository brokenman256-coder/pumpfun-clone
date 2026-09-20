/**
 * Server-side Jupiter v6 quote + swap signed by the bot keypair.
 */
import { VersionedTransaction } from '@solana/web3.js'
import { WSOL } from './solanaPayer.js'

const JUP_QUOTE = 'https://quote-api.jup.ag/v6/quote'
const JUP_SWAP = 'https://quote-api.jup.ag/v6/swap'

export async function jupiterQuote({
  inputMint,
  outputMint,
  amountRaw,
  slippageBps = 150,
}) {
  const q = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(Math.floor(amountRaw)),
    slippageBps: String(slippageBps),
  })
  const res = await fetch(`${JUP_QUOTE}?${q}`)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Jupiter quote failed: ${res.status} ${t.slice(0, 160)}`)
  }
  const data = await res.json()
  if (!data?.outAmount) throw new Error('No Jupiter route for this mint')
  return data
}

export async function jupiterSwap({ connection, payer, quote }) {
  const res = await fetch(JUP_SWAP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: payer.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Jupiter swap build failed: ${res.status} ${t.slice(0, 160)}`)
  }
  const { swapTransaction } = await res.json()
  if (!swapTransaction) throw new Error('Jupiter returned no swap transaction')

  const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'))
  tx.sign([payer])
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  })
  const conf = await connection.confirmTransaction(sig, 'confirmed')
  if (conf.value?.err) {
    throw new Error(`Swap failed: ${JSON.stringify(conf.value.err)}`)
  }
  return sig
}

export async function quoteBuySol({ mint, lamports }) {
  return jupiterQuote({
    inputMint: WSOL,
    outputMint: mint,
    amountRaw: lamports,
  })
}

export async function quoteSellTokens({ mint, amountRaw }) {
  return jupiterQuote({
    inputMint: mint,
    outputMint: WSOL,
    amountRaw,
  })
}

export { WSOL }
