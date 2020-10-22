const User = require('../../../models/user.model.js');

describe('User', () => {
  it('should be defined', () => {
    expect(User).toBeTruthy();
  });
});

describe('User.emailValidationErrors', () => {
  it('should validate an email address', () => {
    let errors = User.emailValidationErrors('test@example.com');
    expect(errors.length).toBe(0);
  });
  it('should not accept an email missing a TLD', () => {
    let errors = User.emailValidationErrors('test@example');
    expect(errors.length > 0).toBe(true);
  });
  it('should not accept an email with nothing before @', () => {
    let errors = User.emailValidationErrors('@example.com');
    expect(errors.length > 0).toBe(true);
  });
  it('should not accept an email with no @', () => {
    let errors = User.emailValidationErrors('testexample.com');
    expect(errors.length > 0).toBe(true);
  });
});

