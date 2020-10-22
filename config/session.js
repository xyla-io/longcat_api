const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
const sessionConfig = require('./environment')('session', {
  secret: 'SESSION_SECRET',
  name: 'SESSION_COOKIE_NAME',
});

module.exports.init = (app) => {
  const store = new MongoStore({ mongooseConnection: mongoose.connection });

  let middleware = session({
    store: store,
    secret: sessionConfig.secret,
    resave: false,
    saveUninitialized: false,
    name: sessionConfig.name,
  });

  this.middleware = middleware;

  app.use(middleware);
};