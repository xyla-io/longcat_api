const Access = require('../../../modules/access');

describe('pathFromComponents', () => {
  it('should join path components', () => {
    expect(Access.pathFromComponents(['companies', 'xyla', 'users'])).toBe('companies_xyla_users');
  });
});

describe('escapedPathComponent', () => {
  it('should convert dashes and undersocres to dash-encoded sequences (analogous to percent-encoded sequences)', () => {
    expect(Access.escapedPathComponent('xyla-io')).toBe('xyla-2Dio');
  });
});
