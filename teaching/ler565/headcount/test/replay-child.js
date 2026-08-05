// Child process for the cross-process determinism check (§12): reads
// {seed, players, moves} as JSON on stdin, replays the game in a fresh
// process, prints the final state hash. The parent compares.
import { replay, stateHash } from '../engine.js';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  const { seed, players, moves } = JSON.parse(input);
  process.stdout.write(stateHash(replay(seed, players, moves)));
});
