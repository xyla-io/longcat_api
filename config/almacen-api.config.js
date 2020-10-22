module.exports = require('./environment')('almacen-api', {
  protocol: 'http:',
  host: 'localhost',
  port: 8000,
  tokens: {
    tagger: 'TOKEN',
    reader: 'TOKEN',
    feeder: 'TOKEN',
  }
});
