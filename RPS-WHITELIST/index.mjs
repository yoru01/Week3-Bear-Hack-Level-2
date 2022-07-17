import {loadStdlib} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
import { ask, yesno } from '@reach-sh/stdlib/ask.mjs';
const stdlib = loadStdlib(process.env);

//create test account
const startingBalance = stdlib.parseCurrency(1000);
const acc = await stdlib.newTestAccount(startingBalance);
let tk =  null;

//Set up functions for checking balance
const fmt = (x) => stdlib.formatCurrency(x, 4);
const getBalance = async () => fmt(await stdlib.balanceOf(acc));
const getTokenBalance = async () => fmt(await stdlib.balanceOf(acc, tk))

const before = await getBalance()
console.log('Your starting balance is: ' + before)
// console.log(`Your address is ${stdlib.formatAddress(acc)}`)
console.log(`Your address is ${acc.getAddress()}`)

//define hand participants can play 
const HAND = ['Rock', 'Paper', 'Scissors'];
const HANDS = {
  'Rock': 0, 'rock': 0, 'R': 0, 'r': 0,
  'Paper': 1, 'paper': 1, 'P': 1, 'p': 1,
  'Scissors': 2, 'scissors': 2, 'S': 2, 's': 2,
};

//Define common interface for both players
const Player = {
  //...hasRandom
  random: () => stdlib.hasRandom.random(),

  //function that gets called when its player's turn to deal a hand
  getHand: async () => {
    const hand = await ask(`What hand will you play?`, (x) => {
      const hand = HANDS[x];
      if ( hand === undefined ) {
        throw Error(`Not a valid hand ${hand}`);
      }
      return hand;
    });
    console.log(`You played ${HAND[hand]}`);
    return hand;
  },

  //function that gets called when player sees outcome of a round
  seeOutcome: async(outcome) => {
    const outcomeDecimal = parseInt(outcome);
    switch (outcomeDecimal) {
      case 0:
        console.log("Bob wins");
        console.log(`Your token balance is ${await getTokenBalance()}`)
        process.exit();
        break;
      case 1:
        console.log("Nobody wins this round");
        break;
      case 2:
        console.log("Alice wins");
        console.log(`Your token balance is ${await getTokenBalance()}`)
        process.exit()
      default:
        break;
    }
  },

  //function that gets called when player joins contract.. This is where player accepts token
  ready: async (token) => {
    const tokenID = stdlib.bigNumberToNumber(token)
    tk = tokenID
    await acc.tokenAccept(tokenID)
  }
};

//Define interface for Dev(token creator)
const Dev = {
  tokenID: async () => {
    console.log(sample)
    const address = await ask('Paste expected attacher address', x => x)
    return address;
  }
};


//Define interface for Alice
const Alice = {
  ...Player
};

//Define interface for Bob
const Bob = {
  ...Player
}

//Program starts here
const program = async () => {

  const isDeployer = await ask(
    `Do you want to create a token and host a game of rock paper scissors for Alice and Bob?`,
    yesno
  )
  let isAlice = null;
  
  if(!isDeployer){
    isAlice = await ask(
      `Do you want to connect as Alice or Bob? \nyes = Alice, \nno = Bob`, yesno
    )
  }
  
  const who = isDeployer ? 'Game host' : isAlice? 'Alice' : 'Bob';
  console.log(`Starting as ${who}`);

  //Contract gets initialized here
  let ctc = null; 

  if(isDeployer){ //if deployer
    ctc =  acc.contract(backend); // connect to contract
    const tk = await stdlib.launchToken(acc, "tk", "TK"); //mint token
    backend.Dev(ctc, { 
      tokenID: () => tk.id,
      viewTokenBalance: async () => {
        console.log('Your token balance is ' + fmt(await stdlib.balanceOf(acc, tk.id)))
        process.exit();
       }
    }); //attach dev object to contract
    console.log('Deploying contract...');
    const info = JSON.stringify(await ctc.getInfo(), null, 1) //fetch contract info
    console.log(`Your token balance is ${fmt(await stdlib.balanceOf(acc, tk.id))}`);
    console.log(info); //display info
  }
  else{
    const info = await ask(
      `Please paste the contract information of the contract you want to subscribe to:`, 
      JSON.parse
    );
    ctc = acc.contract(backend, info);
    isAlice ? backend.Alice(ctc, Alice) : backend.Bob(ctc, Bob)
    console.log("Successfully connected");
    console.log(`Your starting token balance is 0`)
  }

  //After contract deployment, the reach file calls the players' interact functions where needed
}

await program();

// const after = await getBalance()
// console.log('Your balance is: ' + after)
