"reach 0.1";

const [ isHand, ROCK, PAPER, SCISSORS ] = makeEnum(3);
const [ isOutcome, B_WINS, DRAW, A_WINS ] = makeEnum(3);

const winner = (handAlice, handBob) =>
  ((handAlice + (4 - handBob)) % 3);


assert(winner(ROCK, PAPER) == B_WINS);
assert(winner(PAPER, ROCK) == A_WINS);
assert(winner(ROCK, ROCK) == DRAW);

forall(UInt, handAlice =>
  forall(UInt, handBob =>
    assert(isOutcome(winner(handAlice, handBob)))));

forall(UInt, (hand) =>
  assert(winner(hand, hand) == DRAW));

const Player = {
  ...hasRandom,
  getHand: Fun([], UInt),
  seeOutcome: Fun([UInt], Null),
  ready:Fun([Token], Null)
};

export const main = Reach.App(() => {
  setOptions({ untrustworthyMaps: true });
  const Dev = Participant('Dev', {
    tokenID: Fun([], Token),
    viewTokenBalance: Fun([], Null)
  });
  const Alice = Participant('Alice', {
    ...Player,
  });
  const Bob   = Participant('Bob', {
    ...Player,
  });
  
  init();

  Dev.only(() => {
    const tk = declassify(interact.tokenID());
  });
  Dev.publish(tk);
  commit();

  const amt = 100000000000;
  Dev.pay([[amt, tk]]);
  const Whitelist = new Set();
  commit();
  
  Alice.only(() => {
    interact.ready(tk)
  })
  Alice.publish();
  commit();

  Bob.only(() => {
    interact.ready(tk)
  })
  Bob.publish();

  
  const deadline = 100;
  var outcome = DRAW;
  invariant( balance() == balance() && isOutcome(outcome) );
  while ( outcome == DRAW ) {
    commit();

    Alice.only(() => {
      const _handAlice = interact.getHand();
      const [_commitAlice, _saltAlice] = makeCommitment(interact, _handAlice);
      const commitAlice = declassify(_commitAlice);
    });
    Alice.publish(commitAlice)
    //.timeout(relativeTime(deadline), () => closeTo(Bob, informTimeout));
    commit();

    unknowable(Bob, Alice(_handAlice, _saltAlice));
    Bob.only(() => {
      const handBob = declassify(interact.getHand());
    });
    Bob.publish(handBob)
    //.timeout(relativeTime(deadline), () => closeTo(Alice, informTimeout));
    commit();

    Alice.only(() => {
      const saltAlice = declassify(_saltAlice);
      const handAlice = declassify(_handAlice);
    });
    Alice.publish(saltAlice, handAlice)
    //.timeout(relativeTime(deadline), () => closeTo(Bob, informTimeout));
    checkCommitment(commitAlice, saltAlice, handAlice);

    outcome = winner(handAlice, handBob);
    
    continue;
  }
  if (outcome == A_WINS){
    Whitelist.insert(Alice);
    transfer(balance(tk)/2, tk).to(Alice)
  }
  else{
    Whitelist.insert(Bob);
    transfer(balance(tk)/2, tk).to(Bob)
  }
  assert(outcome == A_WINS || outcome == B_WINS);
  //transfer(2 * wager).to(outcome == A_WINS ? Alice : Bob);
  transfer(balance()).to(Dev);
  transfer(balance(tk) ,tk).to(Dev);
  each([Alice, Bob], () => {
    interact.seeOutcome(outcome);
  });
  commit();
  Dev.interact.viewTokenBalance();
});