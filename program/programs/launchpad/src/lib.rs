use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, SetAuthority, Token, TokenAccount, Transfer};

declare_id!("AXgGrZTKV2FJWuVAaj5z36TNGWjJHLQwSkPSh5aLfsg8");

/// Real pump.fun-style tokenomics constants (lamports / raw token units use each mint's decimals).
pub const VIRTUAL_SOL_LAMPORTS: u64 = 30_000_000_000; // 30 SOL
pub const TOTAL_SUPPLY_UI: u64 = 1_000_000_000;
pub const CURVE_SUPPLY_UI: u64 = 793_100_000; // tokens sold off the bonding curve
pub const CREATOR_SUPPLY_UI: u64 = TOTAL_SUPPLY_UI - CURVE_SUPPLY_UI; // 206,900,000 to creator
pub const CREATE_FEE_LAMPORTS: u64 = 20_000_000; // 0.02 SOL
/// No on-chain USD price oracle is wired up, so graduation is triggered by a
/// SOL-denominated raise threshold instead of a USD market cap.
pub const GRADUATION_SOL_LAMPORTS: u64 = 85_000_000_000; // 85 SOL raised

#[program]
pub mod launchpad {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, fee_bps: u16, fee_recipient: Pubkey) -> Result<()> {
        require!(fee_bps <= 1000, LaunchpadError::FeeTooHigh);
        let global = &mut ctx.accounts.global;
        global.authority = ctx.accounts.authority.key();
        global.fee_bps = fee_bps;
        global.fee_recipient = fee_recipient;
        global.bump = ctx.bumps.global;
        Ok(())
    }

    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        require!(name.len() <= 32, LaunchpadError::NameTooLong);
        require!(symbol.len() <= 10, LaunchpadError::SymbolTooLong);
        require!(uri.len() <= 200, LaunchpadError::UriTooLong);

        require!(
            ctx.accounts.fee_recipient.key() == ctx.accounts.global.fee_recipient,
            LaunchpadError::InvalidFeeRecipient
        );
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.fee_recipient.to_account_info(),
                },
            ),
            CREATE_FEE_LAMPORTS,
        )?;

        let decimals = ctx.accounts.mint.decimals;
        let scale = 10u64.checked_pow(decimals as u32).ok_or(LaunchpadError::MathOverflow)?;
        let curve_raw = CURVE_SUPPLY_UI.checked_mul(scale).ok_or(LaunchpadError::MathOverflow)?;
        let creator_raw = CREATOR_SUPPLY_UI.checked_mul(scale).ok_or(LaunchpadError::MathOverflow)?;

        // Mint the fixed supply once: curve share into the vault, dev share to the creator.
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            curve_raw,
        )?;
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            creator_raw,
        )?;
        // Fixed supply forever: no one — including the creator — can mint more.
        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    current_authority: ctx.accounts.creator.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            token::spl_token::instruction::AuthorityType::MintTokens,
            None,
        )?;

        let curve = &mut ctx.accounts.bonding_curve;
        curve.mint = ctx.accounts.mint.key();
        curve.creator = ctx.accounts.creator.key();
        curve.decimals = decimals;
        curve.virtual_sol_reserves = VIRTUAL_SOL_LAMPORTS;
        // virtual token reserves start above the real curve supply, pump.fun-style,
        // using the same ratio as VIRTUAL_TOKENS / CURVE_SUPPLY. Computed in u128
        // since curve_raw * (VIRTUAL_TOKENS - CURVE_SUPPLY_UI) overflows u64.
        let virtual_extra = (curve_raw as u128)
            .checked_mul((1_073_000_000 - CURVE_SUPPLY_UI) as u128)
            .ok_or(LaunchpadError::MathOverflow)?
            .checked_div(CURVE_SUPPLY_UI as u128)
            .ok_or(LaunchpadError::MathOverflow)? as u64;
        curve.virtual_token_reserves = curve_raw
            .checked_add(virtual_extra)
            .ok_or(LaunchpadError::MathOverflow)?;
        curve.real_sol_reserves = 0;
        curve.real_token_reserves = curve_raw;
        curve.complete = false;
        curve.fee_bps = ctx.accounts.global.fee_bps;
        curve.bump = ctx.bumps.bonding_curve;
        curve.name = name;
        curve.symbol = symbol;
        curve.uri = uri;
        Ok(())
    }

    pub fn buy(ctx: Context<Trade>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        require!(
            ctx.accounts.fee_recipient.key() == ctx.accounts.global.fee_recipient,
            LaunchpadError::InvalidFeeRecipient
        );
        let curve = &mut ctx.accounts.bonding_curve;
        require!(!curve.complete, LaunchpadError::AlreadyGraduated);
        require!(sol_amount > 0, LaunchpadError::InvalidAmount);

        let fee = sol_amount
            .checked_mul(curve.fee_bps as u64)
            .ok_or(LaunchpadError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(LaunchpadError::MathOverflow)?;
        let sol_after_fee = sol_amount.checked_sub(fee).ok_or(LaunchpadError::MathOverflow)?;

        let tokens_out = (curve.virtual_token_reserves as u128)
            .checked_mul(sol_after_fee as u128)
            .ok_or(LaunchpadError::MathOverflow)?
            .checked_div(
                (curve.virtual_sol_reserves as u128)
                    .checked_add(sol_after_fee as u128)
                    .ok_or(LaunchpadError::MathOverflow)?,
            )
            .ok_or(LaunchpadError::MathOverflow)? as u64;

        require!(tokens_out > 0, LaunchpadError::InvalidAmount);
        require!(tokens_out >= min_tokens_out, LaunchpadError::SlippageExceeded);
        require!(
            tokens_out <= curve.real_token_reserves,
            LaunchpadError::InsufficientCurveLiquidity
        );

        // Fee straight to treasury, remainder into the curve's own account (it doubles as the SOL vault).
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.fee_recipient.to_account_info(),
                },
            ),
            fee,
        )?;
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: curve.to_account_info(),
                },
            ),
            sol_after_fee,
        )?;

        let mint_key = ctx.accounts.mint.key();
        let seeds: &[&[u8]] = &[b"bonding-curve", mint_key.as_ref(), &[curve.bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: curve.to_account_info(),
                },
                &[seeds],
            ),
            tokens_out,
        )?;

        curve.virtual_sol_reserves = curve
            .virtual_sol_reserves
            .checked_add(sol_after_fee)
            .ok_or(LaunchpadError::MathOverflow)?;
        curve.virtual_token_reserves = curve
            .virtual_token_reserves
            .checked_sub(tokens_out)
            .ok_or(LaunchpadError::MathOverflow)?;
        curve.real_sol_reserves = curve
            .real_sol_reserves
            .checked_add(sol_after_fee)
            .ok_or(LaunchpadError::MathOverflow)?;
        curve.real_token_reserves = curve
            .real_token_reserves
            .checked_sub(tokens_out)
            .ok_or(LaunchpadError::MathOverflow)?;

        if curve.real_sol_reserves >= GRADUATION_SOL_LAMPORTS {
            curve.complete = true;
        }

        Ok(())
    }

    pub fn sell(ctx: Context<Trade>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        require!(
            ctx.accounts.fee_recipient.key() == ctx.accounts.global.fee_recipient,
            LaunchpadError::InvalidFeeRecipient
        );
        let curve = &mut ctx.accounts.bonding_curve;
        require!(!curve.complete, LaunchpadError::AlreadyGraduated);
        require!(token_amount > 0, LaunchpadError::InvalidAmount);

        let sol_gross = (curve.virtual_sol_reserves as u128)
            .checked_mul(token_amount as u128)
            .ok_or(LaunchpadError::MathOverflow)?
            .checked_div(
                (curve.virtual_token_reserves as u128)
                    .checked_add(token_amount as u128)
                    .ok_or(LaunchpadError::MathOverflow)?,
            )
            .ok_or(LaunchpadError::MathOverflow)? as u64;

        let fee = sol_gross
            .checked_mul(curve.fee_bps as u64)
            .ok_or(LaunchpadError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(LaunchpadError::MathOverflow)?;
        let sol_out = sol_gross.checked_sub(fee).ok_or(LaunchpadError::MathOverflow)?;

        require!(sol_out > 0, LaunchpadError::InvalidAmount);
        require!(sol_out >= min_sol_out, LaunchpadError::SlippageExceeded);
        require!(
            curve.real_sol_reserves >= sol_gross,
            LaunchpadError::InsufficientCurveLiquidity
        );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            token_amount,
        )?;

        // The curve account is owned by this program, so it can debit its own
        // lamports directly — a system_program CPI can't move funds *out* of a
        // program-owned account, only direct lamport manipulation can.
        **curve.to_account_info().try_borrow_mut_lamports()? = curve
            .to_account_info()
            .lamports()
            .checked_sub(sol_gross)
            .ok_or(LaunchpadError::MathOverflow)?;
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? = ctx
            .accounts
            .buyer
            .to_account_info()
            .lamports()
            .checked_add(sol_out)
            .ok_or(LaunchpadError::MathOverflow)?;
        **ctx.accounts.fee_recipient.to_account_info().try_borrow_mut_lamports()? = ctx
            .accounts
            .fee_recipient
            .to_account_info()
            .lamports()
            .checked_add(fee)
            .ok_or(LaunchpadError::MathOverflow)?;

        curve.virtual_sol_reserves = curve
            .virtual_sol_reserves
            .checked_sub(sol_gross)
            .ok_or(LaunchpadError::MathOverflow)?;
        curve.virtual_token_reserves = curve
            .virtual_token_reserves
            .checked_add(token_amount)
            .ok_or(LaunchpadError::MathOverflow)?;
        curve.real_sol_reserves = curve
            .real_sol_reserves
            .checked_sub(sol_gross)
            .ok_or(LaunchpadError::MathOverflow)?;
        curve.real_token_reserves = curve
            .real_token_reserves
            .checked_add(token_amount)
            .ok_or(LaunchpadError::MathOverflow)?;

        Ok(())
    }
}

#[account]
pub struct Global {
    pub authority: Pubkey,
    pub fee_bps: u16,
    pub fee_recipient: Pubkey,
    pub bump: u8,
}

impl Global {
    pub const SPACE: usize = 8 + 32 + 2 + 32 + 1;
}

#[account]
pub struct BondingCurve {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub decimals: u8,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub complete: bool,
    pub fee_bps: u16,
    pub bump: u8,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

impl BondingCurve {
    pub const SPACE: usize =
        8 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 1 + 2 + 1 + (4 + 32) + (4 + 10) + (4 + 200);
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = Global::SPACE, seeds = [b"global"], bump)]
    pub global: Account<'info, Global>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateToken<'info> {
    pub global: Account<'info, Global>,

    #[account(
        init,
        payer = creator,
        space = BondingCurve::SPACE,
        seeds = [b"bonding-curve", mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(init, payer = creator, mint::decimals = 9, mint::authority = creator)]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: validated against global.fee_recipient
    #[account(mut)]
    pub fee_recipient: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Trade<'info> {
    pub global: Account<'info, Global>,

    #[account(mut, seeds = [b"bonding-curve", mint.key().as_ref()], bump = bonding_curve.bump)]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(constraint = mint.key() == bonding_curve.mint @ LaunchpadError::MintMismatch)]
    pub mint: Account<'info, Mint>,

    #[account(mut, associated_token::mint = mint, associated_token::authority = bonding_curve)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: validated against global.fee_recipient
    #[account(mut)]
    pub fee_recipient: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum LaunchpadError {
    #[msg("Token has already graduated")]
    AlreadyGraduated,
    #[msg("Fee cannot exceed 10%")]
    FeeTooHigh,
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Symbol too long")]
    SymbolTooLong,
    #[msg("URI too long")]
    UriTooLong,
    #[msg("Fee recipient does not match global config")]
    InvalidFeeRecipient,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Not enough liquidity left in the curve")]
    InsufficientCurveLiquidity,
    #[msg("Mint does not match bonding curve")]
    MintMismatch,
    #[msg("Math overflow")]
    MathOverflow,
}
