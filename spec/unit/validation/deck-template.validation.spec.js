let { DeckTemplateValidator } = require('../../../controllers/validation/deck-template.validation');

describe('DeckTemplateValidator', () => {
  it('Should validate a complex template', () => {
    const parameters = new DeckTemplateValidator({
      path: 'companies_xyla_reports_dashboard_protected_template_deck_breakdown-2Dtable-2Ddeck',
      metadata: {
        templateType: 'deck',
        identifier: 'breakdown-table-deck',
        version: 0,
        parentPath: 'companies_xyla_reports_dashboard_protected_template_master_performance',
        parentVersion: 0,
        more: {},
      },
      structure: {
        templates: [
          {
            reference: 'companies_xyla_reports_dashboard_protected_template_breakdown-5Ftable_breakdown-2Dtable',
          },
        ],
      },
    });
    expect(parameters.validationErrors()).toBeFalsy();
  });
});

