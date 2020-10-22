const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('./config/session');
const cors = require('cors');
const morgan = require('./config/morgan');
const mongoose = require('mongoose');
const databaseConfig = require('./config/database');
const passport = require('./config/passport.js');
const users = require('./controllers/users.controller');
const companies = require('./controllers/companies.controller');
const reports = require('./controllers/reports.controller');
const queries = require('./controllers/queries.controller');
const templates = require('./controllers/templates.controller');
const permissions = require('./controllers/permissions.controller');
const embeds = require('./controllers/embeds.controller');
const navbars = require('./controllers/navbars.controller');
const maintenance = require('./controllers/maintenance.controller');
const demo = require('./controllers/demo.controller');
const http = require('http');
const https = require('https');
const fs = require('fs');
const appConfig = require('./config/app.config');
const Promise = require('q').Promise;
const connectTimeout = require('connect-timeout');
const { SpawnWorker } = require('./modules/worker');

// Get arguments
let config = {
  port: process.argv[2],
  host: process.argv[3],
  ssl: process.argv[4] === 'true',
  site: process.argv[5],
};
appConfig.init(config);

SpawnWorker('scheduler');
SpawnWorker('micra-response-consumer');

if (process.argv[6] === 'development') {
  // Start the development workers
  SpawnWorker('dev-command', { stdin: true });
}

// Connect mongoose to our database
mongoose.Promise = Promise;
mongoose.connect(databaseConfig.databaseURL, {useNewUrlParser: true}).then(() => {
  const app = express();

  // Middleware for CORS
  app.use(cors(appConfig.cors));

  // Middleware for configuring connection timeouts
  app.use(connectTimeout('10m'));

  // Middlewares for bodyparsing using both json and urlencoding
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json({
    limit: '10mb',
  }));

  /*
  express.static is a built in middleware function to serve static files.
  We are telling express server public folder is the place to look for the static files
  */
  app.use(express.static(path.join(__dirname, 'public')));

  session.init(app);
  passport.init(app);
  morgan.init(app);

  app.get('/', (req, res) => {
    res.send('Invalid page');
  });

  // Routing all HTTP requests to respective controllers
  app.use('/api/users', users);
  app.use('/api/companies', companies);
  app.use('/api/reports', reports);
  app.use('/api/queries', queries);
  app.use('/api/templates', templates);
  app.use('/api/permissions', permissions);
  app.use('/api/embeds', embeds);
  app.use('/api/navbars', navbars);
  app.use('/api/maintenance', maintenance);
  app.use('/api/demo', demo);

  // Listen on HTTPS
  if (config.ssl) {
    let options = {
      cert: fs.readFileSync('./ssl/server.crt'),
      key: fs.readFileSync('./ssl/server.key'),
    };

    let server = https.createServer(options, app);
    server.listen(config.port, config.host, () => {
      console.log(`Starting the server on host ${config.host} at port ${config.port} with SSL`);
    });
  } else {
    let server = http.createServer(app);
    server.listen(config.port, config.host, () => {
      console.log(`Starting the server on host ${config.host} at port ${config.port}`);
    });
  }
}, (err) => {
  console.log(err);
});
