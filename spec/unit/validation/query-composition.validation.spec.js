let { CreateSQLQueryValidator } = require('../../../controllers/validation/query-composition.validation');


describe('CreateSQLQueryValidator', () => {
  let minValidQuery;
  let minValidComposition;

  beforeEach(() => {
    minValidQuery = {
      query: 'This is a test query.',
    };
    minValidComposition = {
      table: 'test_table',
      queryType: 'cube',
      parameters: {},
      columns: {
        column1: {
          sql: 'column1',
        },
      },
    };
  });

  it('should not validate undefined', () => {
    let params = new CreateSQLQueryValidator();
    expect(params.validationErrors()).toBeTruthy();
  });
  it('should not validate empty object', () => {
    let params = new CreateSQLQueryValidator({});
    expect(params.validationErrors()).toBeTruthy();
  });
  it('should validate with raw SQL text', () => {
    let params = new CreateSQLQueryValidator(minValidQuery);
    expect(params.validationErrors()).toBeFalsy();
  });
  it('should validate with raw SQL text and description', () => {
    let params = new CreateSQLQueryValidator(Object.assign(minValidQuery, {
      description: 'This is a description of a raw SQL query test.'
    }));
    expect(params.validationErrors()).toBeFalsy();
  });
  it('should accept null parameters.interval', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          interval: null,
        },
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  });
  it('should accept parameters.interval equal to day with numeric value', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          interval: { 'unit': 'day', 'value': 30 },
        },
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  });
  it('should reject invalid parameters.interval.unit', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          interval: { 'unit': 'ZZZ', 'value': 30 },
        },
      }),
    });
    expect(params.validationErrors()).toBeTruthy();
  });
  it('should reject non-numeric parameters.interval.value', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          interval: { 'unit': 'day', 'value': '30' },
        },
      }),
    });
    expect(params.validationErrors()).toBeTruthy();
  });
  it('should accept a parameters.rowFilters array', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          rowFilters: [],
        },
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  })
  it('should require parameters.rowFilters to be an array', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          rowFilters: {},
        },
      }),
    });
    expect(params.validationErrors()).toBeTruthy();
  })
  it('should reject a parameters.rowFilters entry that is an empty object', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          rowFilters: [{}],
        },
      }),
    });
    expect(params.validationErrors()).toBeTruthy();
  })
  it('should accept a parameters.rowFilters entry with the "equal" operator', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          rowFilters: [{
            metadata: {
              templateType: 'row_filter',
              identifier: 'a_filter'
            },
            column: 'column',
            operator: 'equal',
            value: 'hello',
          }],
        },
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  })
  it('should accept a parameters.rowFilters entry with the "less_than_or_equal" operator', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          rowFilters: [{
            metadata: {
              templateType: 'row_filter',
              identifier: 'a_filter'
            },
            column: 'column',
            operator: 'less_than_or_equal',
            value: 'hello',
          }],
        },
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  })
  it('should accept a parameters.rowFilters entry with the "not_equal" operator', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          rowFilters: [{
            metadata: {
              templateType: 'row_filter',
              identifier: 'a_filter'
            },
            column: 'column',
            operator: 'not_equal',
            value: 'hello',
          }],
        },
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  })
  it('should accept a parameters.rowFilters entry with the "is_null" operator', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          rowFilters: [{
            metadata: {
              templateType: 'row_filter',
              identifier: 'a_filter'
            },
            column: 'column',
            operator: 'is_null',
            value: null,
          }],
        },
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  })
  it('should accept a parameters.rowFilters entry with an "or" operator', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          rowFilters: [{
            metadata: {
              templateType: 'row_filter',
              identifier: 'a_filter'
            },
            or: [
              {
                column: 'column',
                operator: 'equal',
                value: 'hello',
              },
              {
                column: 'column',
                operator: 'equal',
                value: 'goodbye',
              },
            ]
          }],
        },
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  })
  it('should accept a parameters.rowFilters entry with an "and" operator', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        parameters: {
          rowFilters: [{
            metadata: {
              templateType: 'row_filter',
              identifier: 'a_filter'
            },
            and: [
              {
                column: 'column1',
                operator: 'equal',
                value: 'hello',
              },
              {
                column: 'column2',
                operator: 'equal',
                value: 'goodbye',
              },
            ]
          }],
        },
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  })
  it('should reject an empty composition object', () => {
    let params = new CreateSQLQueryValidator({ composition: {} });
    expect(params.validationErrors()).toBeTruthy();
  });
  it('should reject an empty composition.columns object', () => {
    let params = new CreateSQLQueryValidator({
      composition: {
        columns: {}
      },
    });
    expect(params.validationErrors()).toBeTruthy();
  });
  it('should require each composition.columns to have a sql or cases property', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        columns: {
          column1: {},
        }
      }),
    });
    expect(params.validationErrors()).toBeTruthy();
  });
  it('should require each composition.columns to have a sql or cases property', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        columns: {
          column1: {
            sql: 'test',
          },
          column2: {
            sql: 'testing',
          },
        }
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  });
  it('should accept a cases array in composition.columns', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        columns: {
          column1: {
            cases: [
              {
                when: { operator: 'equal', column: 'platform', value: '' },
                then: { column: 'column1' }
              },
              {
                when: { operator: 'contains', column: 'platform', value: 'ios' },
                then: { value: 'ios' }
              },
              {
                when: { operator: 'contains', column: 'platform', value: 'android' },
                then: { value: 'android' }
              },
              {
                default: { value: 'column1' },
              },
            ],
          },
        }
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  });
  it('should not accept case without a then property in composition.columns', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        columns: {
          column1: {
            cases: [
              {
                when: { operator: 'equal', column: 'platform', value: '' },
              },
              {
                default: { value: 'column1' },
              },
            ],
          },
        }
      }),
    });
    expect(params.validationErrors()).toBeTruthy();
  });
  it('should not accept case without a when property in composition.columns', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        columns: {
          column1: {
            cases: [
              {
                then: { column: 'column1' }
              },
              {
                default: { value: 'column1' },
              },
            ],
          },
        }
      }),
    });
    expect(params.validationErrors()).toBeTruthy();
  });
  it('should accept nested cases in composition.columns', () => {
    let params = new CreateSQLQueryValidator({
      composition: Object.assign(minValidComposition, {
        columns: {
          column1: {
            cases: [
              {
                and: [
                  {
                    or: [
                      {
                        when: { operator: 'is_null', column: 'platform', value: null },
                      },
                      {
                        when: { operator: 'is_not_null', column: 'platform', value: null },
                      },
                      {
                        and: [
                          {
                            when: { operator: 'contains', column: 'platform', value: 'something' },
                          },
                          {
                            when: { operator: 'not_equal', column: 'platform', value: 'anything' },
                          },
                        ],
                      }
                    ],
                  },
                  {
                    when: { operator: 'less_than', column: 'numeral', value: 8 },
                  },
                  {
                    when: { operator: 'is_null', column: 'platform', value: null },
                  },
                ],
                then: { value: 'android' }
              },
              {
                default: { value: 'column1' },
              },
              {
                default: { value: 'column1' },
              },
            ],
          },
        }
      }),
    });
    expect(params.validationErrors()).toBeFalsy();
  })
  it('should not validate without a composition.table property', () => {
    let params = new CreateSQLQueryValidator({
      composition: {
        columns: minValidComposition.columns,
      }
    });
    expect(params.validationErrors()).toBeTruthy();
  });

  it('should validate a complex composition query', () => {
    let params = new CreateSQLQueryValidator({
      "composition": {
        "queryType": "cube",
        "table": "performance_cube_filtered",
        "parameters": {},
        "columns": {
          "daily_cohort": {
            "sql": "daily_cohort"
          },
          "weekly_cohort": {
            "sql": "weekly_cohort"
          },
          "monthly_cohort": {
            "sql": "to_char(cast(daily_cohort as timestamp), 'YYYY-MM-01') as monthly_cohort"
          },
          "platform": {
            "cases": [
              {
                "when": {
                  "operator": "not_equal",
                  "column": "platform",
                  "value": ""
                },
                "then": {
                  "column": "platform"
                }
              },
              {
                "and": [
                  {
                    "when": {
                      "operator": "equal",
                      "column": "platform",
                      "value": ""
                    }
                  },
                  {
                    "when": {
                      "operator": "contains",
                      "column": "campaign_name",
                      "value": "os"
                    }
                  }
                ],
                "then": {
                  "value": "ios"
                }
              },
              {
                "and": [
                  {
                    "when": {
                      "operator": "equal",
                      "column": "platform",
                      "value": ""
                    }
                  },
                  {
                    "or": [
                      {
                        "when": {
                          "operator": "contains",
                          "column": "campaign_name",
                          "value": "android"
                        }
                      },
                      {
                        "when": {
                          "operator": "contains",
                          "column": "campaign_name",
                          "value": "_ADR_",
                          "options": {
                            "caseSensitive": true
                          }
                        }
                      }
                    ]
                  }
                ],
                "then": {
                  "value": "android"
                }
              },
              {
                "default": {
                  "value": "other"
                }
              }
            ]
          },
          "product_name": {
            "cases": [
              {
                "when": {
                  "operator": "is_null",
                  "column": "product_name",
                  "value": null
                },
                "then": {
                  "value": "App Unknown"
                }
              },
              {
                "default": {
                  "column": "product_name"
                }
              }
            ]
          },
          "campaign_name": {
            "cases": [
              {
                "when": {
                  "operator": "is_null",
                  "column": "campaign_name",
                  "value": null
                },
                "then": {
                  "value": "Campaign Unknown"
                }
              },
              {
                "default": {
                  "column": "campaign_name"
                }
              }
            ]
          },
          "adset_name": {
            "cases": [
              {
                "when": {
                  "operator": "is_null",
                  "column": "adset_name",
                  "value": null
                },
                "then": {
                  "value": "Adset Unknown"
                }
              },
              {
                "default": {
                  "column": "adset_name"
                }
              }
            ]
          },
          "channel": {
            "sql": "channel"
          },
          "campaign_id": {
            "sql": "campaign_id"
          },
          "campaign_tag": {
            "cases": [
              {
                "when": {
                  "operator": "is_null",
                  "column": "campaign_tag",
                  "value": null
                },
                "then": {
                  "value": "Untagged"
                }
              },
              {
                "default": {
                  "column": "campaign_tag"
                }
              }
            ]
          },
          "campaign_subtag": {
            "cases": [
              {
                "when": {
                  "operator": "is_null",
                  "column": "campaign_subtag",
                  "value": null
                },
                "then": {
                  "value": "Untagged"
                }
              },
              {
                "default": {
                  "column": "campaign_subtag"
                }
              }
            ]
          },
          "adset_tag": {
            "sql": "adset_tag"
          },
          "adset_subtag": {
            "sql": "adset_tag"
          },
          "event_name": {
            "sql": "event_name"
          },
          "revenue_type": {
            "cases": [
              {
                "when": {
                  "operator": "equal",
                  "column": "event_name",
                  "value": "af_purchase"
                },
                "then": {
                  "value": "iapr"
                }
              },
              {
                "when": {
                  "operator": "starts_with",
                  "column": "event_name",
                  "value": "ad_",
                  "options": {
                    "caseSensitive": true
                  }
                },
                "then": {
                  "value": "iaar"
                }
              }
            ]
          },
          "spend": {
            "sql": "spend"
          },
          "cohort_events": {
            "sql": "cohort_events"
          },
          "cohort_revenue": {
            "sql": "cohort_revenue"
          },
          "event_day": {
            "sql": "event_day"
          },
          "event_week": {
            "sql": "event_week"
          },
          "mmp": {
            "sql": "mmp"
          }
        }
      },
      "description": "Standard Performance Cube query for all clients."
    });
    expect(params.validationErrors()).toBeFalsy();
  });
});
