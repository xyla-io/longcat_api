const { spawn } = require('child_process');

const children = [];

function killChildren() {
  console.log(`Killing ${children.length} child workers`);
  console.error(children.length);
  children.forEach(child => child.kill());
}
// SIGTERM is the kill signal sent by a normal `kill` commmand
process.once('SIGTERM', () => { process.exit(0); });
// SIGINT is the kill signal sent by ctrl-c
process.once('SIGINT', () => { process.exit(0); });
// SIGUSR2 is the kill signal sent from nodemon
process.once('SIGUSR2', () => { process.exit(0); });
process.once('exit', () => { killChildren(); });
// Note: children won't be cleaned up if the parent process is killed by the SIGKILL (9) signal

function SpawnWorker(workerName, options = {}) {
  const workerPath = `${__dirname}/../workers/${workerName}.worker.js`;
  const args = process.argv.slice(2);
  const spawnOpts = options.stdin ? { stdio: [process.stdin] } : {};
  const child = spawn(process.argv[0], [workerPath, ...args], spawnOpts);
  child.on('close', (code) => {
    if (code) {
      console.log(`${workerName} worker exited with code ${code}`);
      console.log(`Restarting ${workerName}...`);
      SpawnWorker(workerName);
    } 
  });
  child.stdout.on('data', (data) => {
    console.log(`${workerName}.log:`, `${data}`.slice(0, -1));
  });
  child.stderr.on('data', (data) => {
    console.log(`${workerName}.err:`, `${data}`.slice(0, -1));
  });
  children.push(child);
  console.log(`Started ${workerName} worker with pid ${child.pid}`);
}

module.exports.SpawnWorker = SpawnWorker;
