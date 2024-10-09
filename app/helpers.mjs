// helpers.mjs

import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction,
    SystemProgram,
} from "@solana/web3.js";

export const MAX_ZOMBIES = 10;
export const programId = new PublicKey("ES7xLKWwyjtnv1i43AqG8R73HjtS1jDYoZZaoLS9bPYL");

export function createZombieDna() {
    return parseInt('1' + getRandomHexString(13), 16);
}

export function createHumanDna() {
    return parseInt('2' + getRandomHexString(13), 16);
}

function getRandomHexString(length) {
    return Array.from({ length }, () => 
        '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');
}

export const createArmyAccount = async (connection, keyPair) => {
    const blockhashInfo = await connection.getLatestBlockhash();
    const [armyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("ARMY"), keyPair.publicKey.toBuffer()],
        programId
    );

    // Create instruction data
    const instructionData = Buffer.alloc(1);
    instructionData.writeUInt8(0, 0); // 0 for Init instruction (as per your GameInstruction enum)

    // Create a new transaction
    const tx = new Transaction({ ...blockhashInfo });

    console.log('user', keyPair.publicKey);
    console.log('armyPDA', armyPDA);
    console.log('programId', programId);

    // Add our Init instruction
    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {
                    pubkey: keyPair.publicKey,
                    isSigner: true,
                    isWritable: true,
                },
                {
                    pubkey: armyPDA,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: SystemProgram.programId,
                    isSigner: false,
                    isWritable: false,
                },
            ],
            data: instructionData
        })
    );

    try {
        const txHash = await sendAndConfirmTransaction(connection, tx, [keyPair]);
        console.log("Transaction sent with hash:", txHash);

        await connection.confirmTransaction({
            blockhash: blockhashInfo.blockhash,
            lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
            signature: txHash,
        });

        console.log(
            `Congratulations! Look at your 'Init' transaction in the Solana Explorer:
            https://explorer.solana.com/tx/${txHash}?cluster=custom`
        );
    } catch (error) {
        console.error("Error creating Army account:", error);
    }
}

export const showArmyData = async (connection, keyPair) => {
    const [armyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("ARMY"), keyPair.publicKey.toBuffer()],
        programId
    );

    try {
        const accountInfo = await connection.getAccountInfo(armyPDA);

        if (accountInfo === null) {
            console.log("Army account not found. It may not have been created yet.");
            return;
        }

        // Skip the 8-byte discriminator
        const data = accountInfo.data.slice(8);
        const owner = new PublicKey(data.slice(0, 32));
        console.log("Army owner:", owner.toBase58());

        // Read zombies
        console.log("Zombies:");
        for (let i = 0; i < MAX_ZOMBIES; i++) {
            const start = 32 + i * 24; // 32 bytes for owner, each zombie is 24 bytes (8 + 8 + 8)
            const zombieData = data.slice(start, start + 24);
            
            const dna = zombieData.readBigUInt64LE(0);
            const lastFight = zombieData.readBigInt64LE(8);
            const xp = zombieData.readBigUInt64LE(16);

            // if (dna !== BigInt(0)) {  // Only show non-empty zombie slots
                console.log(`  Zombie ${i + 1}:`);
                console.log(`    DNA: ${dna}`);
                console.log(`    Last Fight: ${new Date(Number(lastFight) * 1000)}`);
                console.log(`    XP: ${xp}`);
            // }
        }

    } catch (error) {
        console.error("Error fetching army data:", error);
    }
}

export const removeZombie = async ( connection, keyPair, zombieId) => {
    const blockhashInfo = await connection.getLatestBlockhash();
    
    const [armyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("ARMY"), keyPair.publicKey.toBuffer()],
        programId
    );

    // Create instruction data
    const instructionData = Buffer.alloc(29);
    instructionData.writeUInt8(2, 0); // 1 for Remove instruction
    instructionData.writeUInt8(zombieId, 1);
    // Create a new transaction
    const tx = new Transaction({ ...blockhashInfo });

    // Add our Battle instruction
    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {
                    pubkey: armyPDA,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: keyPair.publicKey,
                    isSigner: true,
                    isWritable: true,
                },
            ],
            data: instructionData
        })
    );

    // Simulate the transaction
    console.log("Simulating transaction...");
    const simulation = await connection.simulateTransaction(tx, [keyPair]);

    // Log the simulation results
    console.log("Simulation logs:");
    simulation.value.logs.forEach(log => console.log(log));

    if (simulation.value.err) {
        console.error("Simulation failed:", simulation.value.err);
        return null;
    }

    try {
        const txHash = await sendAndConfirmTransaction(connection, tx, [keyPair]);
        console.log("Battle transaction sent with hash:", txHash);

        await connection.confirmTransaction({
            blockhash: blockhashInfo.blockhash,
            lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
            signature: txHash,
        });

        console.log(
            `Battle initiated! Look at your transaction in the Solana Explorer:
            https://explorer.solana.com/tx/${txHash}?cluster=custom`
        );

        return txHash;
    } catch (error) {
        console.error("Error initiating battle:", error);
        throw error;
    }
}

export const initiateBattle = async (
    connection,
    keyPair,
    zombieId,
    selection,
    dna1,
    dna2,
    dna3
) => {
    const blockhashInfo = await connection.getLatestBlockhash();

    const dna1Buffer = Buffer.alloc(8);
    dna1Buffer.writeBigUInt64LE(BigInt(dna1));
    const dna2Buffer = Buffer.alloc(8);
    dna2Buffer.writeBigUInt64LE(BigInt(dna2));
    const dna3Buffer = Buffer.alloc(8);
    dna3Buffer.writeBigUInt64LE(BigInt(dna3));
    
    const [battlePDA] = PublicKey.findProgramAddressSync(
        [
            keyPair.publicKey.toBuffer(),
            dna1Buffer,
            dna2Buffer,
            dna3Buffer,
        ],
        programId
    );
    
    console.log("Client-side PDA:", battlePDA.toBase58());

    // Derive PDA for army account
    const [armyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("ARMY"), keyPair.publicKey.toBuffer()],
        programId
    );

    // Create instruction data
    const instructionData = Buffer.alloc(29);
    instructionData.writeUInt8(1, 0); // 1 for Battle instruction
    instructionData.writeUInt8(zombieId, 1);
    instructionData.writeUInt8(selection, 2);
    instructionData.writeBigUInt64LE(BigInt(dna1), 3);
    instructionData.writeBigUInt64LE(BigInt(dna2), 11);
    instructionData.writeBigUInt64LE(BigInt(dna3), 19);

    // Create a new transaction
    const tx = new Transaction({ ...blockhashInfo });

    // Add our Battle instruction
    tx.add(
        new TransactionInstruction({
            programId: programId,
            keys: [
                {
                    pubkey: battlePDA,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: armyPDA,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: keyPair.publicKey,
                    isSigner: true,
                    isWritable: true,
                },
                {
                    pubkey: SystemProgram.programId,
                    isSigner: false,
                    isWritable: false,
                },
            ],
            data: instructionData
        })
    );

    // Simulate the transaction
    console.log("Simulating transaction...");
    try {
        const simulation = await connection.simulateTransaction(tx, [keyPair]);
        simulation.value.logs.forEach(log => console.log(log));

        if (simulation.value.err) {
            console.error("Simulation failed:", simulation.value.err);
            return null;
        }

        const txHash = await sendAndConfirmTransaction(connection, tx, [keyPair]);
        console.log("Battle initiated. Transaction hash:", txHash);
        return txHash;
    } catch (error) {
        console.error("Error initiating battle:", error);
        throw error;
    }
}

export const showBattleData = async (connection, txHash) => {
    try {
        const tx = await connection.getConfirmedTransaction(txHash);
        if (!tx) {
            console.log("Transaction not found");
            return;
        }

        const programInstruction = tx.transaction.instructions.find(
            (ix) => ix.programId.equals(programId)
        );

        if (!programInstruction) {
            console.log("No instruction found for our program");
            return;
        }

        const battleAccountPubkey = programInstruction.keys[0].pubkey;
        const accountInfo = await connection.getAccountInfo(battleAccountPubkey);

        if (!accountInfo) {
            console.log("Battle account not found");
            return;
        }

        if (accountInfo.data.length < 67) {  // 8 + 32 + 24 + 1 + 1 + 1
            console.log("Account data is too short");
            return;
        }

        const data = accountInfo.data.slice(8);
        const owner = new PublicKey(data.slice(0, 32));
        const shuffledOrder = [
            data.readBigUInt64LE(32),
            data.readBigUInt64LE(40),
            data.readBigUInt64LE(48)
        ];
        const zombieId = data[56];
        const selection = data[57];
        const outcome = data[58];

        console.log("Battle Data:");
        console.log("Owner:", owner.toBase58());
        console.log("Shuffled Order:", shuffledOrder);
        console.log("Zombie ID:", zombieId);
        console.log("Selection:", selection);
        console.log("Outcome:", outcome === 1 ? "Won" : "Lost");
    } catch (error) {
        console.error("Error fetching battle data:", error);
    }
}