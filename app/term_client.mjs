// term_client.mjs

import inquirer from 'inquirer';
import chalk from 'chalk';

import Table from 'cli-table3';

import { PublicKey, Connection } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import {
    programId,
    createArmyAccount,
    showArmyData,
    removeZombie,
    initiateBattle,
    showBattleData,
    createHumanDna,
    createZombieDna,
    MAX_ZOMBIES
} from './helpers.mjs';

const connection = new Connection("http://localhost:8899", "confirmed");
const keyPair = await getKeypairFromFile("~/.config/solana/id.json");

async function displayMainMenu() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                'Show Army',
                'Battle',
                'Remove Zombie',
                'Exit'
            ]
        }
    ]);

    switch (action) {
        case 'Show Army':
            await showArmy();
            break;
        case 'Battle':
            await startBattle();
            break;
        case 'Remove Zombie':
            await removeZombiePrompt();
            break;
        case 'Exit':
            console.log('Goodbye!');
            process.exit(0);
    }

    await displayMainMenu();
}

function getZombieArt(dna) {
    const eyes = ['👀', '🧿'][dna % 2];
    const mouth = ['👄', '🦷', '👅', '💋'][dna % 4];
    return `
   🧟
 ${eyes}   ${eyes}  
   ${mouth}  `;
}

function getZombieType(dna) {
    const types = ['Biter', 'Runner', 'Spitter', 'Tank'];
    return types[dna % types.length];
}

async function showArmy() {
    console.log(chalk.green('\n🧟‍♂️ Your Zombie Army 🧟‍♀️\n'));
    const army = await getArmyData();

    if (army.zombies.length === 0) {
        console.log(chalk.yellow('Your army is empty. Go recruit some zombies!'));
        return;
    }

    const table = new Table({
        chars: {
            'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
            'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
            'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
            'right': '║', 'right-mid': '╢', 'middle': '│'
        },
        colWidths: [25, 25, 25],
        wordWrap: true
    });

    const activeZombies = army.zombies.filter(z => z.dna !== BigInt(0));
    
    for (let i = 0; i < activeZombies.length; i += 3) {
        const row = [];
        for (let j = 0; j < 3; j++) {
            if (i + j < activeZombies.length) {
                const zombie = activeZombies[i + j];
                const zombieArt = getZombieArt(Number(zombie.dna));
                const zombieType = getZombieType(Number(zombie.dna));
                const lastFightDate = new Date(Number(zombie.lastFight) * 1000);
                const isReady = Date.now() - lastFightDate.getTime() >= 60000; // 60 seconds cooldown

                row.push(
                    chalk.white(`Zombie #${i + j}`) + '\n' +
                    chalk.cyan(zombieArt) + '\n' +
                    chalk.blue(`Type: ${zombieType}`) + '\n' +
                    chalk.magenta(`DNA: ${zombie.dna.toString().slice(0, 13)}...`) + '\n' +
                    chalk.yellow(`XP: ${zombie.xp}`) + '\n' +
                    chalk.red(`Last Fight:`) + '\n' +
                    chalk.red(`${lastFightDate.toLocaleString()}`) + '\n' +
                    chalk.green(`Status: ${isReady ? 'Ready 💪' : 'Resting 😴'}`)
                );
            } else {
                row.push('');
            }
        }
        table.push(row);
    }

    console.log(table.toString());

    console.log(chalk.blue(`\nTotal Zombies: ${activeZombies.length}`));
    console.log(chalk.yellow(`Available Slots: ${MAX_ZOMBIES - activeZombies.length}`));
}


async function startBattle() {
    const army = await getArmyData();
    const availableZombies = army.zombies.filter(z => z.dna !== BigInt(0));

    if (availableZombies.length === 0) {
        console.log('You have no zombies to battle with!');
        return;
    }

    const { zombieId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'zombieId',
            message: 'Choose a zombie to battle:',
            choices: availableZombies.map((z, i) => ({
                name: `Zombie ${i} (DNA: ${z.dna}, XP: ${z.xp})`,
                value: i
            }))
        }
    ]);

    const { selection } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selection',
            message: 'Choose your battle selection:',
            choices: [0, 1, 2]
        }
    ]);

    const dna1 = createHumanDna();
    const dna2 = createHumanDna();
    const dna3 = createZombieDna();
    try {
        console.log('Initiating battle...');
        const battleTx = await initiateBattle(connection, keyPair, zombieId, selection, dna1, dna2, dna3);
        await showBattleData(connection, battleTx);
    }
    catch (e){
        if (e.toString().includes('Account custom program error: 0x1')) {
            console.log('Your zombie is not ready to fight... you need to give it few minutes of rest');
        }
        else{
            console.log('Error', e.toString());
        }    
    }
}

async function removeZombiePrompt() {
    const army = await getArmyData();
    const availableZombies = army.zombies.filter(z => z.dna !== BigInt(0));

    if (availableZombies.length === 0) {
        console.log('You have no zombies to remove!');
        return;
    }

    const { zombieId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'zombieId',
            message: 'Choose a zombie to remove:',
            choices: availableZombies.map((z, i) => ({
                name: `Zombie ${i} (DNA: ${z.dna}, XP: ${z.xp})`,
                value: i
            }))
        }
    ]);

    await removeZombie(connection, keyPair, zombieId);
    console.log(`Zombie ${zombieId} has been removed.`);
}

async function getArmyData() {
    const [armyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("ARMY"), keyPair.publicKey.toBuffer()],
        programId
    );

    const accountInfo = await connection.getAccountInfo(armyPDA);
    if (!accountInfo) {
        console.log("Army account not found. Creating one...");
        await createArmyAccount(connection, keyPair);
        return { zombies: [] };
    }

    const data = accountInfo.data.slice(8);
    const zombies = [];

    for (let i = 0; i < MAX_ZOMBIES; i++) {
        const start = 32 + i * 24;
        const zombieData = data.slice(start, start + 24);
        
        const dna = zombieData.readBigUInt64LE(0);
        const lastFight = zombieData.readBigInt64LE(8);
        const xp = zombieData.readBigUInt64LE(16);

        zombies.push({ dna, lastFight, xp });
    }

    return { zombies };
}

console.log('Welcome to the Zombie Battle Terminal!');
await displayMainMenu();