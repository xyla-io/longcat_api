const { MicraStore } = require('./micra-store');

class MicraJobs {

  constructor(name) {
    this._name = name;
    this._micraStore = new MicraStore();
  }

  get r() {
    return this._micraStore.r;
  }

  async getAlmacenReadyJobs() {
    let _, jobs = null;
    try {
      [[_, jobs]] = await this.r.xreadAsync('STREAMS', 'almacen_ready_jobs', 0);
      jobs  = jobs.map(job => {
        return {
          name: job[1][1],
          ts: job[0],
        };
      });
    } catch (error) {
      console.log(error);
    }
    return jobs;
  }

  async getActiveJobs() {
    let jobs = null;
    try {
     jobs  = await this.r.smembersAsync('active_jobs');
    } catch (error) {}
    return jobs;
  }

  async getReadyJobs() {
    let jobs = null;
    try {
      jobs = await this.r.smembersAsync('ready_jobs');
    } catch (error) {
      console.error(error);
    }
    return jobs;
  }

  async getLongcatAPIRequests() {
    let jobs = null;
    try {
      jobs = await this.r.lrangeAsync('longcat_api_requests', 0, 0);
    } catch (error) {}
    return jobs;
  }

  async getLongcatAPIRequestsToScore() {
    let jobs = null;
    try {
      jobs = await this.r.lrangeAsync('longcat_api_requests_to_score', 0, 0);
    } catch (error) {}
    return jobs;
  }

  async getLongcatAPIScoringHopper() {
    let jobs = null;
    try {
      jobs = await this.r.lrangeAsync('longcat_api_scoring_hopper', 0, 0);
    } catch (error) {}
    return jobs;
  }

  async getJob(name) {
    return this.r.hgetallAsync(name);
  }
}

module.exports.MicraJobs = MicraJobs;
