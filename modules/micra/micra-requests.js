const { MicraStore } = require('./micra-store');
const { InternalServerError } = require('../error');

const longcat_api_requests_queue = 'longcat_api_requests';

class MicraRequests {
  constructor() {
    this._micraStore = new MicraStore();
  }

  get r() {
    return this._micraStore.r;
  }

  dispatch(actionObject) {
    if (!actionObject.company) { throw new InternalServerError('MicraRequests.dispatch requires a company'); }
    if (!actionObject.action) { throw new InternalServerError('MicraRequests.dispatch requires an action'); }
    console.log('dispatching Micra request');
    this.r.lpush(longcat_api_requests_queue, JSON.stringify(actionObject));
  }
}

MicraRequests.actions = Object.freeze({
  almacen_schedule: 'almacen_schedule',
  tag_update_ui: 'tag_update_ui',
  tag_update_bulk: 'tag_update_bulk',
});

module.exports.MicraRequests = MicraRequests;
