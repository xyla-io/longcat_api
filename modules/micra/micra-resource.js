const { MicraStore } = require('./micra-store');

class MicraResource {

  constructor(name) {
    this._name = name;
    this._micraStore = new MicraStore();
  }

  get r() {
    return this._micraStore.r;
  }

  async retrieve() {
    return this.r.hgetallAsync(this._name);
  }

}

module.exports.MicraResource = MicraResource;
