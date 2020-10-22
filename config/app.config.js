const domainConfig = require('./domain.config');

module.exports.cors = {
  credentials: true,
};

module.exports.init = function(config) {
  this.config = config;
  this.cors.origin = function(origin, callback) {
    if (origin === config.site || origin === undefined || origin === 'http://localhost:4200') {
      callback(null, true);
      return
    }
    if (domainConfig.corsRegex.some(regex => regex.text(origin))) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS.'))
    }
  }
};
