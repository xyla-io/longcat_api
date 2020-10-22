const Q = require('q');
const { MicraStore } = require('./micra-store');

class MicraListener {

  constructor(queueName) {
    this._queueName = queueName;
    // Duplicate the redis client so we can block/subscribe without
    // interfering with the main client
    this.r = MicraStore.duplicateClient();
  }

  consume(onEvent, options={}) {
    this._onEvent = typeof onEvent === 'function' ? onEvent : () => {};
    this._consumeLoop();
  }

  _consumeLoop(options) {
    this.r.brpop(this._queueName, 0, (error, [queue, item]) => {
      this._onEvent(item);
      setTimeout(() => { this._consumeLoop(options) }, 10);
    });
  }

  subscribe(onEvent, { count=0, timeout=0, onTimeout }={}) {
    let deferred = Q.defer();
    this._onEvent = typeof onEvent === 'function' ? onEvent : () => {};
    let rxCount = 0;

    if (timeout) {
      var subscriptionTimer = setTimeout(() => { 
        this.unsubscribe();
        if (typeof onTimeout === 'function') { onTimeout(this._queueName); }
      }, timeout);
    }

    this.r.on('message', (channel, message) => {
      if (channel !== this._queueName) { return; }
      this._onEvent(message);
      if (!count) { return; }
      rxCount += 1;
      if (rxCount < count) { return; }
      if (subscriptionTimer) { clearTimeout(subscriptionTimer); }
      this.unsubscribe();
    });
    this.r.on('subscribe', (channel, count) => {
      if (channel !== this._queueName) { return; }
      deferred.resolve();
    });
    this.r.subscribe(this._queueName);
    return deferred.promise;
  }

  unsubscribe() {
    this.r.unsubscribe();
    this.r.quit();
  }

};

module.exports.MicraListener = MicraListener;
