# Launchpad — real on-chain bonding-curve program (Anchor)

A real Solana program: create/buy/sell instructions move real SOL and real SPL
tokens through an on-chain PDA vault (constant-product bonding curve, same
tokenomics shape as pump.fun — 30 virtual SOL, 1.073B virtual tokens, 793.1M
tokens sold off the curve, 206.9M to the creator). No client-side math stands
in for real fund movement — the frontend in `../src/chain/launchpadClient.ts`
calls this program directly.

Currently deployed program ID: `AXgGrZTKV2FJWuVAaj5z36TNGWjJHLQwSkPSh5aLfsg8`
(update `VITE_LAUNCHPAD_PROGRAM_ID` and `Anchor.toml`/`declare_id!` together if
you deploy your own instance).

## Build

The Anchor/Solana toolchain pinned to this program's dependencies (anchor
0.31.0, an older `platform-tools` SBF compiler) predates several crates'
`edition2024` bump, so a bare `cargo install`/`anchor build` on a modern host
toolchain will fail resolving dependencies. Build inside the matching
verifiable-build container instead, reusing a host-generated lockfile (the
container's own dependency resolution picks incompatible versions):

```bash
# 1. Generate the lockfile with a *host* cargo/rustc new enough to resolve
#    edition2024 crates (only for resolution — the container does the real
#    compile against its older toolchain).
cd program
rm -f Cargo.lock
cargo generate-lockfile

# 2. Build inside the pinned Anchor 0.31.0 container (bundles solana-cli +
#    platform-tools already, avoiding a separate multi-GB toolchain install).
docker run --rm \
  -v "$PWD":/workspace/pumpfun-clone/program \
  -v "$HOME/.cargo/registry":/root/.cargo/registry \
  -w /workspace/pumpfun-clone/program \
  backpackapp/build:v0.31.0 \
  bash -lc 'anchor build --no-idl -- -- --locked'
```

This produces `target/deploy/launchpad.so` + `target/deploy/launchpad-keypair.json`
(the program's upgrade-authority keypair — **never commit this file**, it's
gitignored here on purpose).

IDL generation (`anchor build` without `--no-idl`) currently fails on an
unrelated `proc-macro-error`/`proc-macro2` version conflict inside the pinned
container; the frontend client hand-encodes instructions instead of depending
on a generated IDL (see `launchpadClient.ts`).

## Deploy

```bash
solana program deploy target/deploy/launchpad.so \
  --program-id target/deploy/launchpad-keypair.json \
  --url devnet   # or your target cluster
```

**Newer clusters may require SBPF v3** (`SIMD-0500` disables deploying v0–v2
programs). This program builds to the older SBF ISA the pinned platform-tools
supports; if your target cluster enforces SIMD-0500, either deploy to a
cluster/local validator without it, or rebuild with a newer platform-tools
release once one is available for this Anchor version. A local test validator
without the restriction:

```bash
solana-test-validator --reset --deactivate-feature B8JJXCy5amZyWG9r7EnUYLwzXSXTxG7GZ1qZ1qggo83g
```

## One-time: initialize global config

Every deployment needs a `Global` config account created once (sets the fee
rate and treasury/fee-recipient address other instructions check against):

```bash
FEE_RECIPIENT=E9M6EVwNW8k6jogJ6PRmbeJUR6dhtPuDzWrWH71PwTAw \
RPC_URL=https://api.devnet.solana.com \
LAUNCHPAD_PROGRAM_ID=AXgGrZTKV2FJWuVAaj5z36TNGWjJHLQwSkPSh5aLfsg8 \
node scripts/initialize-global.mjs
```

Uses `~/.config/solana/id.json` as the authority signer/payer — fund it first.

## What the program handles

- `initialize` — one-time global config (fee bps, fee recipient)
- `create_token` — mints the fixed 1B supply once (793.1M to the curve's
  vault ATA, 206.9M to the creator), then permanently revokes mint authority
- `buy` / `sell` — constant-product bonding curve trades; SOL moves directly
  in/out of the bonding-curve PDA account itself (it doubles as the SOL
  vault), tokens move via SPL transfers between the vault ATA and the
  trader's ATA, both signed by the PDA where needed
- Graduation is flagged (`complete = true`) once 85 SOL has been raised
  on the curve; migrating the remaining liquidity to a DEX (Raydium) is not
  implemented — that's a real follow-up project, not a stub pretending to be
  done

## Tests

`tests/launchpad.ts` is a full Anchor/Mocha test suite (create/buy/sell
against a local validator via `anchor test`). `scripts/verify-e2e.mjs` is a
plain Node script exercising the same flow with raw `@solana/web3.js`
(useful without a working `anchor test` toolchain — this is what was actually
used to verify create/buy/sell move real SOL and real SPL tokens correctly).
