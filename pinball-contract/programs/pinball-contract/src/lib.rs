use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("89JUBNerREHS2pzjJNVUwhMY7whP8EGmh5GrEhr8cBgd");

mod errors;

#[program]
pub mod pinball_rewards {
    use super::*;

    pub fn distribute_rewards(ctx: Context<DistributeRewards>, amount: u64) -> Result<()> {
        let treasury = &ctx.accounts.treasury;
        let token_program = &ctx.accounts.token_program;
        let authority = &ctx.accounts.authority;
        let receiver_accounts = &ctx.accounts.receiver;

        let cpi_accounts = Transfer {
            from: treasury.to_account_info(),
            to: receiver_accounts.to_account_info(),
            authority: authority.to_account_info(),
        };

        token::transfer(
            CpiContext::new(token_program.to_account_info(), cpi_accounts),
            amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    #[account(mut)]
    pub receiver: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
