use num_enum::TryFromPrimitive;

#[repr(u8)]
#[derive(Clone, Copy, Debug, Eq, PartialEq, TryFromPrimitive)]
pub enum GameInstruction {
    Init = 0,
    Battle = 1,
    RemoveZombie = 2
}
