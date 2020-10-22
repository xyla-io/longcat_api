const Q = require('q');
const uuid = require('uuid').v4;

const { MicraStore } = require('./micra-store');
const { MicraListener } = require('./micra-listener');

const commandQueue = 'micra_commands';

class MicraCommand {
  constructor({
    command='list',
    options={},
    transformOutput,
  }) {
    this.command = command;
    this.options = options;
    this.transformOutput = transformOutput;
    this._micraStore = new MicraStore();
  }

  async run() {
    let deferred = Q.defer();
    let responseChannel = uuid();
    await (new MicraListener(responseChannel)).subscribe(response => {
      if (typeof this.transformOutput === 'function') {
        response = this.transformOutput(response);
      }
      deferred.resolve(response);
    }, {
      count: 1,
      timeout: 60000,
      onTimeout: () => deferred.reject('No response received within timeout period.'),
    });
    let commmandComponents = MicraCommand._makeCommandComponents(this.command, this.options);
    commmandComponents.push('--publish', responseChannel);
    this._micraStore.r.lpush(commandQueue, commmandComponents.join(' '));
    return deferred.promise;
  }

  static _makeCommandComponents(command, options) {
    return [
      command, 
      ...Object.keys(options).reduce((args, key) => {
        let values = options[key];
        if (!values) { return args; }
        if (!(values instanceof Array)) { values = [values]; }
        values.forEach(value => {
          args.push(`--${key}`);
          if (value === true) { return; }
          args.push(value);
        });
        return args;
      }, []),
    ];
  }
};

MicraCommand.View = class extends MicraCommand {
  constructor({
    format='json',
    structureId=[],
    tag=[],
    publish=[],
    echo=false,
  }={}) {
    super({
      command: 'view',
      transformOutput: {
        string: output => output,
        json: output => JSON.parse(output),
        csv: output => output,
        pretty: output => output,
      }[format],
      options: {
        'structure-id': structureId,
        format,
        tag,
        publish,
        echo,
      }
    });
  }
};

module.exports.MicraCommand = MicraCommand;
