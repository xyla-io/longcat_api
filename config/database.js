module.exports = require('./environment')('database', {
  // 27017 is the default port number.  
  databaseURL: 'mongodb://localhost:27017/DATABASE_NAME',
});
