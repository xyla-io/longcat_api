const config = require('../../config/redis.config');

const redisConfig = {
  host: config.host,
  port: config.port,
};

if (config.auth) {
  redisConfig.password = config.auth;
}

const redis = require('redis').createClient(redisConfig);
const bluebird = require('bluebird');
bluebird.promisifyAll(redis);

class MicraStore {
  constructor() {
    this._redis = redis;
  }

  get r() {
    return this._redis;
  }
}

MicraStore.duplicateClient = () => {
  return bluebird.promisifyAll(redis.duplicate());
};

module.exports.MicraStore = MicraStore;
