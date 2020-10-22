const databaseConfig = require('../config/database');
const mongoose = require('mongoose');
const Promise = require('q').Promise;
const AlmacenConfig = require('../models/almacen-config.model').AlmacenConfig;
const { MicraListener } = require('../modules/micra/micra-listener');
const { MicraResource } = require('../modules/micra/micra-resource');
const { MicraRequests } = require('../modules/micra/micra-requests');

mongoose.Promise = Promise;
mongoose.connect(databaseConfig.databaseURL, {useNewUrlParser: true}).then(() => {

  (new MicraListener(MicraRequests.actions.almacen_schedule)).subscribe(async jobKey => {
    console.log('Recieved job response for', jobKey);
    const resource = new MicraResource(jobKey);
    let job;
    try {
      job = await resource.retrieve();
      console.dir(job);
    } catch (error) {
      console.warn(`Problem retrieving job for ${jobKey}`);
      return;
    }
    if (!job) {
      console.warn(`Job not found for ${jobKey}`);
      return;
    }
    if (!job.company) {
      console.warn(`Completed job is missing a company identifier for ${jobKey}`);
      return;
    }
    if (job.result != 0) {
      console.warn(`Job failed for ${jobKey} with error: ${job.result}`);
      return;
    }

    let config;
    try {
      [config] = await AlmacenConfig.getAllByCompany(job.company);
    } catch (err) {
      console.warn(`Problem retrieving company config for completed job: ${jobKey}`);
      return;
    }
    if (!config) {
      console.warn(`No company config found for completed job: ${jobKey}`);
      return;
    }
    config.lastRunComplete = new Date();
    config.save();
    console.log('AlmacenConfig job updated at', config.lastRunComplete.toString());
  });

}).catch(error => {
  console.error(error);
  process.exit(1);
});

