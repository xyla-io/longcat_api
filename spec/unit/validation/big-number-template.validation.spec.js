let { BigNumberTemplateValidator } = require('../../../controllers/validation/big-number-template.validation');

describe('BigNumberTemplateValidator', () => {
  it('Should validate a complex template', () => {
    const parameters = new BigNumberTemplateValidator({
      path: 'companies_xyla_reports_dashboard_unprotected_template_big-5Fnumber_9dfa966d-2D97a0-2D4773-2D98a9-2Dd34e6fc465a9',
      metadata: {
        templateType: 'big_number',
        identifier: '9dfa966d-97a0-4773-98a9-d34e6fc465a9',
        version: 0,
        parentPath: 'companies_xyla_reports_dashboard_protected_template_master_performance',
        parentVersion: 0,
        more: {},
      },
      structure: {
        displayColumn: {
          uid: '5dfbdc90-9f31-4090-b572-1ca865d1e2bf',
          parameters: {},
          identifier: 'cost_per_sign_up',
        },
        size: 'normal',
      },
    });
    expect(parameters.validationErrors()).toBeFalsy();
  });
});

