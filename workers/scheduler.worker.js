const databaseConfig = require('../config/database');
const mongoose = require('mongoose');
const Promise = require('q').Promise;
const AlmacenConfig = require('../models/almacen-config.model').AlmacenConfig;
const { MicraRequests } = require('../modules/micra/micra-requests');
const { CollectionScheduler } = require('./modules/collection-scheduler');

/*
  interface Schedulable {
    path: string;
    schedule: string[];
  }
*/

const micraRequests = new MicraRequests();

mongoose.Promise = Promise;
mongoose.connect(databaseConfig.databaseURL, {useNewUrlParser: true}).then(() => {

  (new CollectionScheduler(AlmacenConfig)).monitor(async (schedulable, time) => {
    console.log(['Loading Almacén', time, schedulable.path]);
    schedulable.lastRunEnqueued = new Date();
    schedulable.save();
    micraRequests.dispatch({
      company: Object.keys(schedulable.config)[0],
      action: MicraRequests.actions.almacen_schedule,
      body: schedulable.config,
    });
  }, {
    interval: 5000,
  });

}).catch(error => {
  console.error(error);
  process.exit(1);
});

