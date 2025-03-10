use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("11111111111111111111111111111111");

mod errors;

#[program]
pub mod pinball_rewards {
    use super::*;

    pub fn distribute_rewards(ctx: Context<DistributeRewards>, rewards: Vec<u64>) -> Result<()> {
        let treasury = &ctx.accounts.treasury;
        let token_program = &ctx.accounts.token_program;
        let authority = &ctx.accounts.authority;
        let player_accounts = ctx.remaining_accounts;

        if player_accounts.len() != rewards.len() {
            return Err(errors::ErrorCode::InvalidInput.into());
        }

        for (i, reward) in rewards.iter().enumerate() {
            let player_token_account = &player_accounts[i];
            let cpi_accounts = Transfer {
                from: treasury.to_account_info(),
                to: player_token_account.to_account_info(),
                authority: authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_accounts);
            token::transfer(cpi_ctx, *reward)?;
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
