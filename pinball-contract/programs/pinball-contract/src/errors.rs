use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("The number of rewards does not match the number of provided player accounts.")]
    InvalidInput,
}
