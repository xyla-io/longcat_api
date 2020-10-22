const { scheduleJob } = require('node-schedule');

class CollectionScheduler {
  constructor(SchedulableCollection) {
    this._jobs = new Map();
    this._schedulables = new Map();
    this.SchedulableCollection = SchedulableCollection;
  }
 
  monitor(onOccurence, options={}) {
    this._onOccurence = typeof onOccurence === 'function' ? onOccurence : () => {};
    options.interval = options.interval || 5000;
    this._monitorRecurring(options);
  }

  _monitorRecurring(options) {
    this.SchedulableCollection.find().then(schedulables => {
      const itemsToSchedule = schedulables.reduce((map, schedulable) => {
        map.set(schedulable.path, schedulable);
        return map;
      }, new Map());

      // Update or delete existing jobs
      this._jobs.forEach((_, path) => {
        if (itemsToSchedule.has(path)) {
          this._updateSchedulable(itemsToSchedule.get(path));
          itemsToSchedule.delete(path);
        } else {
          this._deleteSchedulable(path);
        }
      });

      // Add new jobs
      itemsToSchedule.forEach(schedulable => this._addSchedulable(schedulable));

    }).catch(error => {
      console.log(error);
    });

    setTimeout(() => { this._monitorRecurring(options); }, options.interval);
  }

  _createJob(time, path) {
    const { hour, minute } = time;
    let event = new Date();
    event.setUTCHours(hour);
    event.setUTCMinutes(minute);
    const job = scheduleJob({
      hour: event.getHours(),
      minute: event.getMinutes()
    }, async () => {
      // Get the latest version of the schedulable
      let schedulable = await this.SchedulableCollection.findOne({ path });
      this._onOccurence(schedulable, time);
    });
    return job;
  }

  _addSchedulable(schedulable) {
    const { disabled, path, schedule } = schedulable;
    if (disabled) {
      this._deleteSchedulable(path);
      return;
    }
    this._schedulables.set(path, schedulable);
    this._jobs.set(
      path,
      new Map(schedule.map(time => [time, this._createJob(time, path)]))
    );
  }

  _updateSchedulable(schedulable) {
    const { disabled, path, schedule } = schedulable;
    if (disabled) {
      this._deleteSchedulable(path);
      return;
    }
    const jobs = this._jobs.get(path);
    jobs.forEach((job, time) => {
      let scheduleIndex = schedule.indexOf(time);
      if (scheduleIndex > -1) {
        schedule.splice(scheduleIndex, 1);
      } else {
        job.cancel();
        jobs.delete(time);
      }
    });
    this._schedulables.set(path, schedulable);
    schedule.forEach(time => jobs.set(time, this._createJob(time, path)));
  }

  _deleteSchedulable(path) {
    const jobs = this._jobs.get(path);
    if (!jobs) { return; }
    jobs.forEach((job, time) => {
      job.cancel();
      jobs.delete(time);
    });
    this._jobs.delete(path);
    this._schedulables.delete(path);
  }
};

module.exports.CollectionScheduler = CollectionScheduler;
