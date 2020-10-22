module.exports = {
  domain: {
    name: 'YOUR_DOMAIN_WITH_TLD',
    corsRegex: [
      /https:\/\/[^.]+\.YOUR_DOMAIN_NAME\.io/,
    ],
    productName: 'Xyla',
  },
  aws: {
    credentialsFile: './environment/aws-credentials.json',
  },
  database: {
    databaseURL: 'mongodb://localhost:27017/longcat',
  },
  'almacen-api': {
    tokens: {
      tagger: 'TOKEN',
      reader: 'TOKEN',
      feeder: 'TOKEN',
    }
  },
  session: {
    secret: 'SESSION_SECRET',
    name: 'SESSION_COOKIE_NAME'
  },
  recipients: {
    debugEmailTo: [
      'EMAIL_ADDRESS',
    ],
    inquiryEmailTo: [
      'EMAIL_ADDRESS',
    ],
  },
  email: {
    from: 'EMAIL_ADDRESS',
    transportOptions: {
      host: 'EMAIL_HOST',
      port: 587,
      requireTLS: true,
      auth: {
        user: 'USER',
        pass: 'PASS',
      }
    }
  },
  redis: {
    host: 'HOST',
    port: 0,
    auth: 'AUTH',
  },
  'datadragon-api': {
    apiKey: 'API_KEY',
    uxHost: 'localhost',
    uxPort: 4300,
    apiHost: 'localhost',
    apiPort: 3300,
  },
  periscopedata: {
    domain: 'https://www.periscopedata.com',
    apiKey: 'PERISCOPE_API_KEY',
  },
  modeanalytics: {
    name: 'longcat',
    accessKey: 'ACCESS_KEY',
    accessSecret: 'ACCESS_SECRET',
    maxReportAge: 60 * 60 * 24 * 365,
  }
};
