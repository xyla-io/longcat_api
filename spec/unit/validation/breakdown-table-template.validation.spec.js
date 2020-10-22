let { BreakdownTableTemplateValidator } = require('../../../controllers/validation/breakdown-table-template.validation');

describe('BreakdownTableTemplateValidator', () => {
  it('Should validate a complex template', () => {
    const parameters = new BreakdownTableTemplateValidator({
      path: 'companies_xyla_reports_dashboard_protected_template_breakdown-5Ftable_breakdown-2Dtable',
      metadata: {
        templateType: 'breakdown_table',
        identifier: 'breakdown-table',
        version: 0,
        parentPath: 'companies_xyla_reports_dashboard_protected_template_master_performance',
        parentVersion: 0,
        more: {},
      },
      queryParameters: {
        interval: {
          value: 30,
          unit: 'day',
        },
      },
      structure: {
        displayColumns: [
          {
            uid: '1aea0893-97b7-481a-a986-4556d66c2c00',
            identifier: 'spend',
            parameters: {},
          },
          {
            uid: '7cb459ec-c64f-4a10-8555-daa6ea71c391',
            identifier: 'revenue',
            parameters: {},
          },
          {
            uid: '5704a40d-fafe-4617-81e0-2ab4155c987f',
            identifier: 'event_install',
            parameters: {},
          },
          {
            uid: 'c5aa52bf-b78b-4c7f-8256-8d05d0273020',
            identifier: 'cost_per_install',
            parameters: {},
          },
          {
            uid: '86493e7d-8c14-49ef-bbae-cef4a3cc99ce',
            identifier: 'roas',
            parameters: {},
          },
        ],
        displayBreakdownIdentifiers: [
          'channel',
          'platform',
          'campaign_name',
        ],
        options: {
          rowFilters: [
            {
              column: 'product_name',
              operator: 'equal',
              value: 'Xyla',
            }
          ]
        },
      },
    });
    expect(parameters.validationErrors()).toBeFalsy();
  });
});

