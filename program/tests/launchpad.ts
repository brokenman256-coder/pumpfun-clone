import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { assert } from 'chai'

describe('launchpad', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = anchor.workspace.Launchpad as Program

  const authority = provider.wallet as anchor.Wallet
  const feeRecipient = Keypair.generate()

  const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from('global')], program.programId)

  async function airdrop(pubkey: PublicKey, sol = 2) {
    const sig = await provider.connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL)
    await provider.connection.confirmTransaction(sig, 'confirmed')
  }

  it('initializes global config', async () => {
    await program.methods
      .initialize(100, feeRecipient.publicKey)
      .accounts({
        global: globalPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const global = await (program.account as any).global.fetch(globalPda)
    assert.equal(global.feeBps, 100)
    assert.equal(global.feeRecipient.toBase58(), feeRecipient.publicKey.toBase58())
  })

  it('creates a token with a live bonding curve', async () => {
    const mint = Keypair.generate()
    const creator = Keypair.generate()
    await airdrop(creator.publicKey, 3)

    const [curvePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.publicKey.toBuffer()],
      program.programId,
    )
    const vaultAta = getAssociatedTokenAddressSync(mint.publicKey, curvePda, true)
    const creatorAta = getAssociatedTokenAddressSync(mint.publicKey, creator.publicKey)

    await program.methods
      .createToken('Test Coin', 'TEST', 'https://example.com/meta.json')
      .accounts({
        global: globalPda,
        bondingCurve: curvePda,
        mint: mint.publicKey,
        vaultTokenAccount: vaultAta,
        creatorTokenAccount: creatorAta,
        creator: creator.publicKey,
        feeRecipient: feeRecipient.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mint, creator])
      .rpc()

    const curve = await (program.account as any).bondingCurve.fetch(curvePda)
    assert.equal(curve.complete, false)
    assert.equal(curve.realTokenReserves.toString(), (793_100_000n * 10n ** 9n).toString())
  })

  it('lets a buyer swap SOL for tokens on the curve', async () => {
    const mint = Keypair.generate()
    const creator = Keypair.generate()
    const buyer = Keypair.generate()
    await airdrop(creator.publicKey, 3)
    await airdrop(buyer.publicKey, 3)

    const [curvePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.publicKey.toBuffer()],
      program.programId,
    )
    const vaultAta = getAssociatedTokenAddressSync(mint.publicKey, curvePda, true)
    const creatorAta = getAssociatedTokenAddressSync(mint.publicKey, creator.publicKey)
    const buyerAta = getAssociatedTokenAddressSync(mint.publicKey, buyer.publicKey)

    await program.methods
      .createToken('Buy Coin', 'BUY', 'https://example.com/meta.json')
      .accounts({
        global: globalPda,
        bondingCurve: curvePda,
        mint: mint.publicKey,
        vaultTokenAccount: vaultAta,
        creatorTokenAccount: creatorAta,
        creator: creator.publicKey,
        feeRecipient: feeRecipient.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mint, creator])
      .rpc()

    const feeBefore = await provider.connection.getBalance(feeRecipient.publicKey)

    await program.methods
      .buy(new anchor.BN(0.5 * LAMPORTS_PER_SOL), new anchor.BN(0))
      .accounts({
        global: globalPda,
        bondingCurve: curvePda,
        mint: mint.publicKey,
        vaultTokenAccount: vaultAta,
        buyerTokenAccount: buyerAta,
        buyer: buyer.publicKey,
        feeRecipient: feeRecipient.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc()

    const feeAfter = await provider.connection.getBalance(feeRecipient.publicKey)
    assert.isAbove(feeAfter, feeBefore)

    const buyerBalance = await provider.connection.getTokenAccountBalance(buyerAta)
    assert.isAbove(Number(buyerBalance.value.amount), 0)

    const curve = await (program.account as any).bondingCurve.fetch(curvePda)
    assert.isAbove(Number(curve.realSolReserves.toString()), 0)
  })

  it('lets a seller swap tokens back for SOL', async () => {
    const mint = Keypair.generate()
    const creator = Keypair.generate()
    const trader = Keypair.generate()
    await airdrop(creator.publicKey, 3)
    await airdrop(trader.publicKey, 3)

    const [curvePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.publicKey.toBuffer()],
      program.programId,
    )
    const vaultAta = getAssociatedTokenAddressSync(mint.publicKey, curvePda, true)
    const creatorAta = getAssociatedTokenAddressSync(mint.publicKey, creator.publicKey)
    const traderAta = getAssociatedTokenAddressSync(mint.publicKey, trader.publicKey)

    await program.methods
      .createToken('Sell Coin', 'SELL', 'https://example.com/meta.json')
      .accounts({
        global: globalPda,
        bondingCurve: curvePda,
        mint: mint.publicKey,
        vaultTokenAccount: vaultAta,
        creatorTokenAccount: creatorAta,
        creator: creator.publicKey,
        feeRecipient: feeRecipient.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mint, creator])
      .rpc()

    await program.methods
      .buy(new anchor.BN(1 * LAMPORTS_PER_SOL), new anchor.BN(0))
      .accounts({
        global: globalPda,
        bondingCurve: curvePda,
        mint: mint.publicKey,
        vaultTokenAccount: vaultAta,
        buyerTokenAccount: traderAta,
        buyer: trader.publicKey,
        feeRecipient: feeRecipient.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([trader])
      .rpc()

    const held = await provider.connection.getTokenAccountBalance(traderAta)
    const solBefore = await provider.connection.getBalance(trader.publicKey)

    await program.methods
      .sell(new anchor.BN(held.value.amount), new anchor.BN(0))
      .accounts({
        global: globalPda,
        bondingCurve: curvePda,
        mint: mint.publicKey,
        vaultTokenAccount: vaultAta,
        buyerTokenAccount: traderAta,
        buyer: trader.publicKey,
        feeRecipient: feeRecipient.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([trader])
      .rpc()

    const solAfter = await provider.connection.getBalance(trader.publicKey)
    assert.isAbove(solAfter, solBefore)

    const heldAfter = await provider.connection.getTokenAccountBalance(traderAta)
    assert.equal(heldAfter.value.amount, '0')
  })
})
