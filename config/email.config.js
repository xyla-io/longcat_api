module.exports = require('./environment')('email', {
  from: 'FROM_EMAIL_ADDRESS',
  transportOptions: {
    host: 'HOST',
    port: 587,
    requireTLS: true,
    auth: {
      user: 'EMAIL_ADDRESS',
      pass: 'PASSWORD',
    }
  }
});
