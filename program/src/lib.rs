mod init;
mod battle;
mod remove_zombie;

use init::process_init;
use battle::process_battle;
use remove_zombie::process_remove_zombie;

use api::instructions::GameInstruction;
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint;
use solana_program::entrypoint::ProgramResult;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if program_id.ne(&api::ID) {
        return Err(ProgramError::IncorrectProgramId);
    }

    let (tag, _) = data
        .split_first()
        .ok_or(ProgramError::InvalidInstructionData)?;

    match GameInstruction::try_from(*tag).or(Err(ProgramError::InvalidInstructionData))? {
        GameInstruction::Init => process_init(accounts)?,
        GameInstruction::Battle => process_battle(accounts, data)?,
        GameInstruction::RemoveZombie => process_remove_zombie(accounts, data)?,
    }
    Ok(())
}
