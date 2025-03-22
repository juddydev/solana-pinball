import * as anchor from "@coral-xyz/anchor";
import { BN, Program, web3 } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  mintTo
} from "@solana/spl-token";
import { assert } from "chai";
import { PinballRewards } from "../target/types/pinball_rewards";

describe("pinball-rewards", () => {
  const program = anchor.workspace.PinballRewards as Program<PinballRewards>;
  const connection = anchor.getProvider().connection;

  // Authority wallet sẽ là người có quyền chuyển token từ treasury
  const authorityWallet = anchor.workspace.PinballRewards.provider.wallet;

  let mint: web3.PublicKey;
  let treasury: web3.PublicKey;

  beforeEach(async () => {
    // Tạo mint mới cho mỗi test case
    mint = await createMint(
      connection,
      authorityWallet.payer,
      authorityWallet.publicKey,
      null,
      9
    );

    // Tạo treasury account
    treasury = await createAssociatedTokenAccount(
      connection,
      authorityWallet.payer,
      mint,
      authorityWallet.publicKey
    );

    // Mint 1000 tokens vào treasury
    await mintTo(
      connection,
      authorityWallet.payer,
      mint,
      treasury,
      authorityWallet.publicKey,
      1000_000_000_000 // 1000 tokens
    );
  });

  it("Successfully distributes rewards when authority signs", async () => {
    const receiverWallet = web3.Keypair.generate();
    const receiverAta = await createAssociatedTokenAccount(
      connection,
      authorityWallet.payer,
      mint,
      receiverWallet.publicKey
    );

    const transferAmount = new BN(100_000_000_000); // 100 tokens

    await program.methods
      .distributeRewards(transferAmount)
      .accounts({
        authority: authorityWallet.publicKey,
        treasury: treasury,
        receiver: receiverAta,
      })
      .signers([authorityWallet.payer])
      .rpc();

    // Verify balances
    const receiverBalance = await getAccount(connection, receiverAta);
    const treasuryBalance = await getAccount(connection, treasury);

    assert.equal(receiverBalance.amount.toString(), "100000000000");
    assert.equal(treasuryBalance.amount.toString(), "900000000000");
  });

  it("Fails when non-authority tries to distribute", async () => {
    // Tạo một wallet khác không phải authority
    const nonAuthorityWallet = web3.Keypair.generate();

    // Airdrop SOL cho non-authority wallet để trả phí giao dịch
    await connection.requestAirdrop(
      nonAuthorityWallet.publicKey,
      1 * web3.LAMPORTS_PER_SOL
    );

    const receiverWallet = web3.Keypair.generate();
    const receiverAta = await createAssociatedTokenAccount(
      connection,
      authorityWallet.payer,
      mint,
      receiverWallet.publicKey
    );

    try {
      await program.methods
        .distributeRewards(new BN(100_000_000_000))
        .accounts({
          authority: nonAuthorityWallet.publicKey,
          treasury: treasury,
          receiver: receiverAta,
        })
        .signers([nonAuthorityWallet])
        .rpc();

      assert.fail("Should have failed with unauthorized signer");
    } catch (err) {
      assert.ok(err);
      // Verify treasury balance hasn't changed
      const treasuryBalance = await getAccount(connection, treasury);
      assert.equal(treasuryBalance.amount.toString(), "1000000000000");
    }
  });

  it("Fails when trying to transfer more than treasury balance", async () => {
    const receiverWallet = web3.Keypair.generate();
    const receiverAta = await createAssociatedTokenAccount(
      connection,
      authorityWallet.payer,
      mint,
      receiverWallet.publicKey
    );

    try {
      await program.methods
        .distributeRewards(new BN(2000_000_000_000)) // Try to transfer 2000 tokens when treasury only has 1000
        .accounts({
          authority: authorityWallet.publicKey,
          treasury: treasury,
          receiver: receiverAta,
        })
        .signers([authorityWallet.payer])
        .rpc();

      assert.fail("Should have failed with insufficient funds");
    } catch (err) {
      assert.ok(err);
      // Verify balances remained unchanged
      const receiverBalance = await getAccount(connection, receiverAta);
      const treasuryBalance = await getAccount(connection, treasury);

      assert.equal(receiverBalance.amount.toString(), "0");
      assert.equal(treasuryBalance.amount.toString(), "1000000000000");
    }
  });

  it("Fails when receiver token account doesn't exist", async () => {
    const receiverWallet = web3.Keypair.generate();
    // Không tạo token account cho receiver

    try {
      await program.methods
        .distributeRewards(new BN(100_000_000_000))
        .accounts({
          authority: authorityWallet.publicKey,
          treasury: treasury,
          receiver: receiverWallet.publicKey, // This is not a token account
        })
        .signers([authorityWallet.payer])
        .rpc();

      assert.fail("Should have failed with invalid receiver account");
    } catch (err) {
      assert.ok(err);
      // Verify treasury balance hasn't changed
      const treasuryBalance = await getAccount(connection, treasury);
      assert.equal(treasuryBalance.amount.toString(), "1000000000000");
    }
  });

  it("Fails when trying to transfer 0 tokens", async () => {
    const receiverWallet = web3.Keypair.generate();
    const receiverAta = await createAssociatedTokenAccount(
      connection,
      authorityWallet.payer,
      mint,
      receiverWallet.publicKey
    );

    try {
      await program.methods
        .distributeRewards(new BN(0))
        .accounts({
          authority: authorityWallet.publicKey,
          treasury: treasury,
          receiver: receiverAta,
        })
        .signers([authorityWallet.payer])
        .rpc();

      assert.fail("Should have failed with zero amount");
    } catch (err) {
      assert.ok(err);
    }
  });
});
