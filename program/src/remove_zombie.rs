use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
};
use api::ID;
use api::state::Army;
use api::errors::GameErrorCode;
use steel::*;

pub fn process_remove_zombie(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let zombie_id = data[1];
    let army_info = next_account_info(account_info_iter)?;
    let owner_info = next_account_info(account_info_iter)?;

    msg!("Removing zombie from army {}", zombie_id);

    // Verify owner
    owner_info.is_signer()?;
    army_info.is_writable()?;

    let army = army_info.to_account_mut::<Army>(&ID)?;
    // make sure that signer owns the army
    if army.owner != *owner_info.key {
        return Err(GameErrorCode::Unauthorized.into());
    }
    
    // make sure that zombie is within 0..9
    match zombie_id {
        0..=9 => army.zombies[zombie_id as usize].remove(),
        _ => return Err(GameErrorCode::InvalidZombieId.into()),
    }
    
    



    Ok(())
}