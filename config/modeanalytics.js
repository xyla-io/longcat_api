module.exports = require('./environment')('modeanalytics', {
  name: 'longcat',
  accessKey: 'ACCESS_KEY',
  accessSecret: 'ACCESS_SECRET',
  maxReportAge: 60 * 60 * 24 * 365,
});