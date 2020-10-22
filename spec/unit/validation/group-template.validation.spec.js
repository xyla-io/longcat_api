let { GroupTemplateValidator } = require('../../../controllers/validation/group-template.validation');

describe('GroupTemplateValidator', () => {
  it('Should validate a complex template', () => {
    const parameters = new GroupTemplateValidator({
      path: 'companies_xyla_reports_dashboard_protected_template_group_summary-2Dpanel',
      metadata: {
        templateType: 'group',
        identifier: 'summary-panel',
        version: 1,
        parentPath: 'companies_xyla_reports_dashboard_protected_template_master_performance',
        parentVersion: 0,
        more: {
          groupKey: 'summaryPanel',
        },
      },
      queryParameters: {
        interval: {
          value: 30,
          unit: 'day',
        },
      },
      structure: {
        displayName: 'Summary',
        templates: [
          {
            reference: 'companies_xyla_reports_dashboard_unprotected_template_big-5Fnumber_103e656c-2D8cd2-2D4360-2Daf80-2De847303958a9',
          },
          {
            reference: 'companies_xyla_reports_dashboard_unprotected_template_big-5Fnumber_2fef7056-2De274-2D480f-2Db334-2D51a55234e436',
          },
          {
            reference: 'companies_xyla_reports_dashboard_unprotected_template_big-5Fnumber_3cdddb6d-2D6a3a-2D4c18-2D8ad8-2Db00e2e982780',
          },
          {
            reference: 'companies_xyla_reports_dashboard_unprotected_template_big-5Fnumber_9dfa966d-2D97a0-2D4773-2D98a9-2Dd34e6fc465a9',
          },
        ],
      },
    });
    expect(parameters.validationErrors()).toBeFalsy();
  });
});

