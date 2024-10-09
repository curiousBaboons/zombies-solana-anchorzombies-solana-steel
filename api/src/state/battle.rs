use bytemuck::{Pod, Zeroable};
use solana_program::pubkey::Pubkey;
use solana_program::msg;

use steel::*;
use crate::constants::MAX_CARDS;


#[repr(u8)]
#[derive(Clone, Copy, Debug, Eq, PartialEq, IntoPrimitive, TryFromPrimitive)]
pub enum BattleAccount {
    Battle = 0,
}


#[repr(C, packed)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct Battle {
    pub owner: Pubkey,
    pub shuffled_order: [u64; MAX_CARDS as usize],
    pub zombie_id: u8,
    pub selection: u8,
    pub outcome: u8,

}

impl Battle {
    pub fn shuffle_dna(&mut self, dna_values: [u64; MAX_CARDS as usize]) {
        let random_index = Self::random_number();
        // shuffle the dna values based on the random index
        self.shuffled_order = match random_index {
            0 => dna_values,
            1 => [dna_values[1], dna_values[2], dna_values[0]],
            2 => [dna_values[2], dna_values[0], dna_values[1]],
            _ => [0, 0, 0],
        };
    }

    pub fn determine_battle_outcome(&mut self) {
        // find selected dna in shuffled_order using selection 
        let selected_dna = self.shuffled_order[self.selection as usize];
        let selected_dna_hex = format!("{:x}", selected_dna);
        msg!("Selected DNA: {}", selected_dna_hex);
        let first_char = selected_dna_hex.chars().next().unwrap();
        msg!("First char: {}", first_char);

        // determine battle outcome based on the first character of the selected dna
        self.outcome = match first_char {
            '1' => 0, // LOST
            _ => 1, // WON
        };
    }

    fn random_number() -> u8 {
        // generate a random number between 0 and 2
        let slot = Clock::get().unwrap().slot;
        let xorshift_output = Self::xorshift64(slot);
        let random_no = xorshift_output % MAX_CARDS as u64;
        random_no.try_into().unwrap()
    }

    fn xorshift64(seed: u64) -> u64 {
        // Xorshift64 algorithm
        let mut x = seed;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        x
    }
}

account!(BattleAccount, Battle);

