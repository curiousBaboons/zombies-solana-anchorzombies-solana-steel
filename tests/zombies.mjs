import { Connection, Keypair } from "@solana/web3.js";
import { assert } from "chai";
import { createArmyAccount, getArmyPda, getArmyData, initiateBattle, createHumanDna, createZombieDna, removeZombie} from './helpers.mjs';


describe("zombies", () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  let testArmy, testUser;

  const topUp = async (wallet) => {
    let txhash = await connection.requestAirdrop(wallet.publicKey, 1e9);
    await connection.confirmTransaction(txhash);
  };

  const createArmy = async (payer) => {
    const armyPDA = await createArmyAccount(connection, payer);
    const army = await getArmyData(connection, payer);
    return [army, armyPDA];
  };

  const battle = async (user, zombieId, selection, dna1, dna2, dna3 ) => {
    const { battlePDA, battleData }  = await initiateBattle(connection, user, zombieId, selection, dna1, dna2, dna3);
    return { battlePDA, battleData };
  };
  

  it("Is initialize the Army!", async () => {
    testUser = Keypair.generate();
    await topUp(testUser);
    
    let [testArmy] = await createArmy(testUser);    
    assert(testArmy.owner.equals(testUser.publicKey));
    
    const zombie = testArmy.zombies[0];
    assert(zombie.dna > 0)
  });

  it("it wins the battle when facing human only ", async () => {
    const dna = BigInt(createHumanDna().toString());
    const dna2 = BigInt(createHumanDna().toString());
    const dna3 = BigInt(createHumanDna().toString());
    const selection = 2;
    const zombie_id = 0;
    
    const { battleData, battlePDA } = await battle(testUser, zombie_id, selection, dna, dna2, dna3);
    
    assert(battleData.selection === selection);
    assert(battleData.outcome === 1); // WON

    // make sure it added new zombie to hord
    const armyData = await getArmyData(connection, testUser);
    assert(armyData.zombies.filter(z => z.dna > 0).length == 2);
  });

  it("it loses the battle when facing zombies only ", async () => {
    const dna = BigInt(createZombieDna().toString());
    const dna2 = BigInt(createZombieDna().toString());
    const dna3 = BigInt(createZombieDna().toString());
    const selection = 2;
    const zombie_id = 1;
    
    const { battleData, battlePDA } = await battle(testUser, zombie_id, selection, dna, dna2, dna3);
    
    assert(battleData.selection === selection);
    assert(battleData.outcome === 0); // LOST

    // make sure we still have 2 zombies only
    const armyData = await getArmyData(connection, testUser);
    assert(armyData.zombies.filter(z => z.dna > 0).length == 2);
  });

  
  it("it fails the battle when wrong army provided ", async () => {
    const dna = BigInt(createZombieDna().toString());
    const dna2 = BigInt(createZombieDna().toString());
    const dna3 = BigInt(createZombieDna().toString());
    const selection = 2;
    const zombie_id = 0;

    const newUser = Keypair.generate();
    await topUp(newUser);
    
    try{
      const { battleData, battlePDA } = await battle(newUser, zombie_id, selection, dna, dna2, dna3);
      assert.fail("Expected an error but none was thrown");
    }
    catch (e){
      assert(e.toString().includes("Invalid account owner"));
    }
  });
  
  it("zombie needs rest between battles", async () => {
    const dna = BigInt(createZombieDna().toString());
    const dna2 = BigInt(createZombieDna().toString());
    const dna3 = BigInt(createZombieDna().toString());
    const selection = 2;
    const zombie_id = 0;

    try{
      const { battleData, battlePDA } = await battle(testUser, zombie_id, selection, dna, dna2, dna3);
      assert.fail("Expected an error but none was thrown");
    }
    catch (e){
      assert(e.toString().includes("custom program error"));
    }
  });

  it("removes zombie from army", async () => {
    let armyData = await getArmyData(connection, testUser);
    assert(armyData.zombies.filter(z => z.dna > 0).length == 2);
    
    const armyPDA = await getArmyPda(testUser);
    await removeZombie(connection, armyPDA, testUser, 0);
    
    armyData = await getArmyData(connection, testUser);
    assert(armyData.zombies.filter(z => z.dna > 0).length == 1);
  })

  it("it fails to remove zombie when wrong army provided ", async () => {
    const armyPDA = await getArmyPda(testUser);

    const newUser = Keypair.generate();
    await topUp(newUser);
    
    try{
      await removeZombie(connection, armyPDA, newUser, 0);
      assert.fail("Expected an error but none was thrown");
    }
    catch (e){
      assert(e.toString().includes("custom program error"));
    }
  });
  

});

