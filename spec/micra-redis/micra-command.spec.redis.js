const { MicraCommand } = require('../../modules/micra/micra-command');

describe('MicraCommand.View', () => {
  it('should default to array output.', async () => {
    let result = await (new MicraCommand.View()).run();
    expect(result instanceof Array).toBe(true);
  });
  it('should return structures with a data object.', async () => {
    let [{data}] = await (new MicraCommand.View({ tag: 'job' })).run();
    expect(typeof data).toBe('object');
  });
  it('should return structures with a schema object.', async () => {
    let [{schema}] = await (new MicraCommand.View({ tag: 'job' })).run();
    expect(typeof schema).toBe('object');
  });
  it('should return structures with an identifier string.', async () => {
    let [{identifier}] = await (new MicraCommand.View({ tag: 'job' })).run();
    expect(typeof identifier).toBe('string');
  });
});
