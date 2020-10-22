let { MasterTemplateValidator } = require('../../../controllers/validation/master-template.validation');
const masterPerformanceTemplate = require('../../../models/templates/master-performance.template.js');

describe('MasterTemplateValidator', () => {
  it('Should validate the default master template', () => {
    const template = masterPerformanceTemplate();
    template.path = 'test_path';
    const parameters = new MasterTemplateValidator(template);
    expect(parameters.validationErrors()).toBeFalsy();
  });

  it('Should validate a complex template', () => {
    const parameters = new MasterTemplateValidator({
      path: 'companies_xyla_reports_dashboard_protected_template_master_performance',
      metadata: {
        templateType: 'master',
        identifier: 'performance',
        version: 0,
        parentPath: 'global_queries_core.performance',
        parentVersion: 0,
        more: {
          mergePath: 'global_template_master_performance',
        },
      },
      structure: {
        defaultDisplayName: 'Performance',
        columnCategories: [
          {
            metadata: {
              identifier: 'spend',
              templateType: 'column_category',
            },
            displayName: 'Spend',
            columnIdentifiers: [
              'spend',
            ],
          },
          {
            metadata: {
              identifier: 'revenue',
              templateType: 'column_category',
            },
            displayName: 'Revenue',
            columnIdentifiers: [
              'revenue',
              'roas',
            ],
          },
          {
            metadata: {
              identifier: 'event_install',
              templateType: 'column_category',
            },
            displayName: 'Installs',
            columnIdentifiers: [
              'event_install',
              'cost_per_install',
            ],
          },
        ],
        dynamicColumnCategories: [
          {
            metadata: {
              identifier: 'product_events',
              templateType: 'dynamic_column_category',
            },
            columnCategoryForEach: {
              distinctValuesColumn: 'event_name',
              inscribeDisplayName: '{value}',
              generateTemplateColumns: [
                {
                  tag: 'event_sum',
                  inscribeDisplayName: 'Number of {value}',
                  columnType: 'sum',
                  sumColumn: 'cohort_events',
                },
                {
                  tag: 'cost_per_event',
                  inscribeDisplayName: 'Cost per {value}',
                  columnType: 'quotient',
                  numeratorReference: {
                    template: 'spend',
                  },
                  denominatorReference: {
                    tag: 'event_sum',
                  },
                  options: {
                    format: 'currency',
                  },
                },
              ],
            },
          },
        ],
        templateBreakdowns: [
          {
            metadata: {
              identifier: 'channel',
              templateType: 'breakdown',
            },
            displayName: 'Channel',
            groupColumn: 'channel',
            descendantIdentifiers: [
              'platform',
              'campaign_name',
              'campaign_tag',
              'campaign_subtag',
              'adset_name',
              'daily_cohort',
              'weekly_cohort',
              'monthly_cohort',
            ],
          },
          {
            metadata: {
              identifier: 'platform',
              templateType: 'breakdown',
            },
            displayName: 'Platform',
            groupColumn: 'platform',
            descendantIdentifiers: [
              'channel',
              'campaign_name',
              'campaign_tag',
              'campaign_subtag',
              'adset_name',
              'daily_cohort',
              'weekly_cohort',
              'monthly_cohort',
            ],
          },
          {
            metadata: {
              identifier: 'campaign_name',
              templateType: 'breakdown',
            },
            displayName: 'Campaign Name',
            groupColumn: 'campaign_name',
            descendantIdentifiers: [
              'adset_name',
              'daily_cohort',
              'weekly_cohort',
              'monthly_cohort',
            ],
          },
          {
            metadata: {
              identifier: 'campaign_tag',
              templateType: 'breakdown',
            },
            displayName: 'Campaign Tag',
            groupColumn: 'campaign_tag',
            descendantIdentifiers: [
              'channel',
              'platform',
              'campaign_name',
              'campaign_subtag',
              'adset_name',
              'daily_cohort',
              'weekly_cohort',
              'monthly_cohort',
            ],
          },
          {
            metadata: {
              identifier: 'campaign_subtag',
              templateType: 'breakdown',
            },
            displayName: 'Campaign Subtag',
            groupColumn: 'campaign_subtag',
            descendantIdentifiers: [
              'channel',
              'platform',
              'campaign_name',
              'campaign_tag',
              'adset_name',
              'daily_cohort',
              'weekly_cohort',
              'monthly_cohort',
            ],
          },
          {
            metadata: {
              identifier: 'adset_name',
              templateType: 'breakdown',
            },
            displayName: 'Adset Name',
            groupColumn: 'adset_name',
            descendantIdentifiers: [
              'daily_cohort',
              'weekly_cohort',
              'monthly_cohort',
            ],
          },
          {
            metadata: {
              identifier: 'daily_cohort',
              templateType: 'breakdown',
            },
            displayName: 'Daily Cohort',
            groupColumn: 'daily_cohort',
            descendantIdentifiers: [
              'channel',
              'platform',
              'campaign_name',
              'campaign_tag',
              'campaign_subtag',
              'adset_name',
            ],
          },
          {
            metadata: {
              identifier: 'weekly_cohort',
              templateType: 'breakdown',
            },
            displayName: 'Weekly Cohort',
            groupColumn: 'weekly_cohort',
            descendantIdentifiers: [
              'channel',
              'platform',
              'campaign_name',
              'campaign_tag',
              'campaign_subtag',
              'adset_name',
              'daily_cohort',
            ],
          },
          {
            metadata: {
              identifier: 'monthly_cohort',
              templateType: 'breakdown',
            },
            displayName: 'Monthly Cohort',
            groupColumn: 'monthly_cohort',
            descendantIdentifiers: [
              'channel',
              'platform',
              'campaign_name',
              'campaign_tag',
              'campaign_subtag',
              'adset_name',
              'daily_cohort',
              'weekly_cohort',
            ],
          },
        ],
        templateColumns: [
          {
            displayName: 'Spend',
            metadata: {
              templateType: 'column',
              columnType: 'sum',
              identifier: 'spend',
            },
            options: {
              format: 'currency',
            },
            sumColumn: 'spend',
          },
          {
            displayName: 'Revenue',
            metadata: {
              templateType: 'column',
              columnType: 'sum',
              identifier: 'revenue',
            },
            options: {
              format: 'currency',
              variableRowFilters: [
                {
                  metadata: {
                    identifier: 'variable_row_filter:event_cohort',
                    templateType: 'variable_row_filter',
                  },
                  inscribeDisplayName: '{column} {value} {displayName}',
                  optional: true,
                  optionalName: 'Total',
                  inscribeDisplayNameOptional: 'Total {displayName}',
                  'default': null,
                  operator: {
                    constant: {
                      operator: 'equal',
                      displayName: '',
                    },
                  },
                  column: {
                    choices: [
                      {
                        column: 'event_week',
                        displayName: 'Week',
                      },
                      {
                        column: 'event_day',
                        displayName: 'Day',
                      },
                    ],
                  },
                  value: {
                    columnChoices: {
                      event_week: {
                        select: {
                          min: 0,
                          max: 4,
                        },
                      },
                      event_day: {
                        select: {
                          min: 0,
                          max: 7,
                        },
                      },
                    },
                  },
                },
              ],
            },
            sumColumn: 'cohort_revenue',
          },
          {
            displayName: 'ROAS',
            metadata: {
              templateType: 'column',
              columnType: 'quotient',
              identifier: 'roas',
            },
            denominatorTemplateColumn: {
              metadata: {
                templateType: 'column',
                columnType: 'reference',
                reference: 'spend',
              },
            },
            numeratorTemplateColumn: {
              metadata: {
                templateType: 'column',
                columnType: 'reference',
                reference: 'revenue',
              },
            },
            options: {
              format: 'percent',
            },
          },
          {
            displayName: 'Number of Installs',
            metadata: {
              templateType: 'column',
              columnType: 'sum',
              identifier: 'event_install',
            },
            options: {
              rowFilters: [
                {
                  metadata: {
                    identifier: 'row_filter:event_name',
                    templateType: 'row_filter',
                  },
                  column: 'event_name',
                  operator: 'equal',
                  value: 'install',
                },
              ],
            },
            sumColumn: 'cohort_events',
          },
          {
            displayName: 'Cost Per Install',
            metadata: {
              templateType: 'column',
              columnType: 'quotient',
              identifier: 'cost_per_install',
            },
            denominatorTemplateColumn: {
              metadata: {
                templateType: 'column',
                columnType: 'reference',
                reference: 'event_install',
              },
            },
            numeratorTemplateColumn: {
              metadata: {
                templateType: 'column',
                columnType: 'reference',
                reference: 'spend',
              },
            },
            options: {
              format: 'currency',
            },
          },
        ],
        options: {
          variableRowFilters: [
            {
              metadata: {
                templateType: 'variable_row_filter',
                identifier: 'row_filter:product_name',
              },
              inscribeDisplayName: '{value}',
              optional: true,
              optionalName: 'All',
              inscribeDisplayNameOptional: 'All Apps',
              'default': null,
              operator: {
                constant: {
                  operator: 'equal',
                  displayName: '',
                },
              },
              column: {
                constant: {
                  column: 'product_name',
                  displayName: 'Filter by App',
                },
              },
              value: {
                choices: {
                  select: {
                    values: [],
                    dynamicValues: {
                      distinctValuesColumn: 'product_name',
                      mergeStrategy: 'merge',
                    },
                  },
                },
              },
            },
          ],
        },
      },
    });
    expect(parameters.validationErrors()).toBeFalsy();
  });
});

