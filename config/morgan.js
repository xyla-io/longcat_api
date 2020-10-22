const morgan = require('morgan');

module.exports.init = (app) => {
  app.use(morgan('dev'));
};