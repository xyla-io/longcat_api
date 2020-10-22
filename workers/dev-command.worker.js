const readline = require('readline');
const mongoose = require('mongoose');
const Promise = require('q').Promise;

const databaseConfig = require('../config/database');
const AlmacenConfig = require('../models/almacen-config.model').AlmacenConfig;
const { MicraRequests } = require('../modules/micra/micra-requests');
const { MicraCommand } = require('../modules/micra/micra-command');

const micraRequests = new MicraRequests();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

mongoose.Promise = Promise;
mongoose.connect(databaseConfig.databaseURL, {useNewUrlParser: true}).then(() => {

  rl.on('line', (line) => {
    let [command, ...args] = line.split(' ').filter(entry => entry);
    ({
      view: () => (new MicraCommand.View({echo: true})).run().then(console.log),
      sched: () => {
        args[0] = args[0] || 'walmart';
        AlmacenConfig.find({
          path: `companies_${args[0]}_feeds_core_config`
        }).then(([config]) => {
          if (!config) {
            return console.log(`no AlmacenConfig found for ${args[0]}`);
          }
          console.log(config);
          micraRequests.dispatch({
            company: Object.keys(config.config)[0],
            action: MicraRequests.actions.almacen_schedule,
            body: config.config,
          });
        });
      },

    }[command] || (() => console.log('unknown command:', command)))();
  });

}).catch(error => {
  console.error(error);
  process.exit(1);
});

