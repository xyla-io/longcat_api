const productNameVariableRowFilter = require('./product-name.variable-row-filter.template');
const uuid = require('uuid').v4;

function masterPerformanceTemplate() {
  return {
    metadata: {
      templateType: 'master',
      identifier: 'performance',
      version: 0,
      parentPath: 'global_queries_core.performance',
      parentVersion: 0,
      more: {},
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
            identifier: 'dynamic_column_category:product_events:install',
            templateType: 'column_category',
          },
          displayName: 'Installs',
          columnIdentifiers: [
            'dynamic_column:product_events:event_sum:install',
            'dynamic_column:product_events:cost_per_event:install',
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
                options: {
                  variableRowFilters: [
                    {
                      metadata: {
                        templateType: 'variable_row_filter',
                        identifier: 'row_filter:product_events:event_sum:event_cohort',
                      },
                      inscribeDisplayName: '{column} {value} {displayName}',
                      optional: true,
                      optionalName: 'Total',
                      inscribeDisplayNameOptional: 'Total {displayName}',
                      'default': null,
                      operator: {
                        constant: {
                          operator: 'less_than_or_equal',
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
                }
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
                  templateType: 'variable_row_filter',
                  identifier: 'row_filter:event_cohort',
                },
                inscribeDisplayName: '{column} {value} {displayName}',
                optional: true,
                optionalName: 'Total',
                inscribeDisplayNameOptional: 'Total {displayName}',
                'default': null,
                operator: {
                  constant: {
                    operator: 'less_than_or_equal',
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
            identifier: 'dynamic_column:product_events:event_sum:install',
          },
          options: {
            rowFilters: [
              {
                metadata: {
                  templateType: 'row_filter',
                  identifier: uuid(),
                },
                column: 'event_name',
                operator: 'equal',
                value: 'install',
              },
            ],
            variableRowFilters: [
              {
                metadata: {
                  templateType: 'variable_row_filter',
                  identifier: 'row_filter:event_cohort',
                },
                inscribeDisplayName: '{column} {value} {displayName}',
                optional: true,
                optionalName: 'Total',
                inscribeDisplayNameOptional: 'Total {displayName}',
                'default': null,
                operator: {
                  constant: {
                    operator: 'less_than_or_equal',
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
          sumColumn: 'cohort_events',
        },
        {
          displayName: 'Cost Per Install',
          metadata: {
            templateType: 'column',
            columnType: 'quotient',
            identifier: 'dynamic_column:product_events:cost_per_event:install',
          },
          denominatorTemplateColumn: {
            metadata: {
              templateType: 'column',
              columnType: 'reference',
              reference: 'dynamic_column:product_events:event_sum:install',
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
          productNameVariableRowFilter(),
        ],
      },
    },
  }
}

module.exports = masterPerformanceTemplate;