use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    pubkey::Pubkey
};
use api::ID;
use api::state::{Army, Battle, Zombie};
use api::errors::GameErrorCode;
use steel::*;

pub fn process_battle(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    // Parse instruction data
    if data.len() != 29 { // 1 (tag) + 1 (zombie_id) + 1 (selection) + 3 * 8 (dna values) = 29
        return Err(ProgramError::InvalidInstructionData);
    }

    let zombie_id = data[1];
    let selection = data[2];
    let dna1 = u64::from_le_bytes(data[3..11].try_into().unwrap());
    let dna2 = u64::from_le_bytes(data[11..19].try_into().unwrap());
    let dna3 = u64::from_le_bytes(data[19..27].try_into().unwrap());

    let battle_info = next_account_info(account_info_iter)?;
    let army_info = next_account_info(account_info_iter)?;
    let owner_info = next_account_info(account_info_iter)?;
    let system_program_info = next_account_info(account_info_iter)?;

    // Verify owner
    owner_info.is_signer()?;

    // Verify PDA
    let seeds = &[
        owner_info.key.as_ref(),
        &dna1.to_le_bytes(),
        &dna2.to_le_bytes(),
        &dna3.to_le_bytes(),
    ];
    
    let (pda, bump) = Pubkey::find_program_address(seeds, &ID);
    if pda != *battle_info.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Create battle account if it doesn't exist
    if battle_info.data_is_empty() {
        create_account::<Battle>(
            battle_info,
            &ID,
            &[seeds[0], seeds[1], seeds[2], seeds[3], &[bump]],
            system_program_info,
            owner_info,
        )?;
    }

    // Load accounts
    let battle = battle_info.to_account_mut::<Battle>(&ID)?;
    let army = army_info.to_account_mut::<Army>(&ID)?;

    // Initialize battle
    battle.owner = *owner_info.key;
    battle.zombie_id = zombie_id;
    battle.selection = selection;

    // Check if zombie is ready
    if !army.zombies[zombie_id as usize].is_ready() {
        return Err(GameErrorCode::ZombieNotReady.into());
    }

    // Update zombie last fight timestamp
    army.zombies[zombie_id as usize].set_last_fight();

    // Shuffle DNA and determine battle outcome
    battle.shuffle_dna([dna1, dna2, dna3]);
    battle.determine_battle_outcome();

    if battle.outcome == 1 { // Assuming 1 represents BattleOutcome::Won
        // Add XP to zombie
        army.zombies[zombie_id as usize].add_xp();

        // Get human DNA from shuffled order using battle.selection as index
        let human_dna = battle.shuffled_order[battle.selection as usize];
        // Create new zombie from human DNA
        let new_zombie = Zombie::from_dna(human_dna);
        // Add zombie to army
        army.add_zombie(new_zombie)?;
    }

    Ok(())
}