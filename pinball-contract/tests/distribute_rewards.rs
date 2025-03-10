use anchor_lang::prelude::*;
use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer, transaction::Transaction};
use anchor_spl::token::{self, TokenAccount};
use spl_associated_token_account::{create_associated_token_account, get_associated_token_address};

#[tokio::test]
async fn test_distribute_rewards_success() {
    let program_id = pinball_rewards::id();
    let mut program_test = ProgramTest::new(
        "pinball_rewards",
        program_id,
        processor!(pinball_rewards::entry),
    );

    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    let authority = Keypair::new();
    let treasury_ata = get_associated_token_address(&authority.pubkey(), &program_id);

    // Create player accounts
    let player1 = Keypair::new();
    let player2 = Keypair::new();
    let player3 = Keypair::new();

    let player1_ata = get_associated_token_address(&player1.pubkey(), &program_id);
    let player2_ata = get_associated_token_address(&player2.pubkey(), &program_id);
    let player3_ata = get_associated_token_address(&player3.pubkey(), &program_id);

    let rewards = vec![10u64, 20u64, 30u64];

    let mut accounts = vec![
        AccountMeta::new(treasury_ata, false),
        AccountMeta::new_readonly(authority.pubkey(), true),
        AccountMeta::new_readonly(spl_token::id(), false),
    ];
    accounts.push(AccountMeta::new(player1_ata, false));
    accounts.push(AccountMeta::new(player2_ata, false));
    accounts.push(AccountMeta::new(player3_ata, false));

    let ix = Instruction {
        program_id,
        accounts,
        data: pinball_rewards::instruction::DistributeRewards { rewards }.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer, &authority],
        recent_blockhash,
    );

    banks_client.process_transaction(tx).await.unwrap();
}
