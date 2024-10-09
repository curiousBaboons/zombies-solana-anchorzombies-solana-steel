use num_enum::IntoPrimitive;
use steel::*;
use thiserror::Error;

#[derive(Debug, Error, Clone, Copy, PartialEq, Eq, IntoPrimitive)]
#[repr(u32)]
pub enum GameErrorCode {
    #[error("Invalid zombie ID")]
    InvalidZombieId,

    #[error("Zombie is not ready to fight")]
    ZombieNotReady,

    #[error("Invalid DNA value")]
    InvalidDna,

    #[error("Invalid selection")]
    InvalidSelection,

    #[error("Army is full")]
    ArmyFull,

    #[error("Insufficient XP")]
    InsufficientXp,

    #[error("Invalid battle outcome")]
    InvalidBattleOutcome,

    #[error("Battle already in progress")]
    BattleInProgress,

    #[error("Unauthorized access")]
    Unauthorized,

    #[error("Arithmetic overflow")]
    ArithmeticOverflow,

    #[error("You have reach your army limit")]
    NoEmptySlot,
}

error!(GameErrorCode);