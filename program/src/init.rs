use api::ID;
use api::state::army::{Army, Zombie};
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;

use steel::*;

pub fn process_init(accounts: &[AccountInfo]) -> ProgramResult {
    let [payer, army_account, system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    msg!("Initializing the Army account");
    payer.is_signer()?.is_writable()?;
    army_account.is_writable()?;
    system_program.is_program(&solana_program::system_program::ID)?;


    // Derive PDA for army account
    let seeds = &[b"ARMY", payer.key.as_ref()];
    let (pda, bump) = Pubkey::find_program_address(seeds, &ID);

    // Verify the derived address matches the provided army account
    if pda != *army_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Create the account
    create_account::<Army>(
        army_account,
        &ID,
        &[seeds[0], seeds[1], &[bump]],
        system_program,
        payer,
    )?;

    // Initialize the Army account
    let army = army_account.to_account_mut::<Army>(&ID)?;
    army.owner = *payer.key;
    let z = Zombie::from_key(*payer.key);
    msg!("zombie: {:?}", z.dna);
    army.zombies[0] = z;

    msg!("Army account initialized successfully, {}", army.zombies.len());

    Ok(())
}

