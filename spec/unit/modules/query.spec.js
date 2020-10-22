let {
  sqlFromCases,
  sqlFromRowFilter,
} = require('../../../modules/query');

describe('sqlFromRowFilter', () => {
  it('should implement an is_null operator', async () => {
    expect(sqlFromRowFilter({
      column: 'mmp',
      operator: 'is_null',
      value: null,
    })).toBe(`mmp is null`);
  });
  it('should implement an is_not_null operator', async () => {
    expect(sqlFromRowFilter({
      column: 'channel',
      operator: 'is_not_null',
      value: null,
    })).toBe(`channel is not null`);
  });
  it('should implement an equal operator', async () => {
    expect(sqlFromRowFilter({
      column: 'mmp',
      operator: 'equal',
      value: 'Google',
    })).toBe(`mmp = 'Google'`);
  });
  it('should implement a not_equal operator', async () => {
    expect(sqlFromRowFilter({
      column: 'spend',
      operator: 'not_equal',
      value: 80302000,
    })).toBe(`spend <> 80302000`);
  });
  it('should implement a less_than operator', async () => {
    expect(sqlFromRowFilter({
      column: 'revenue',
      operator: 'less_than',
      value: 7.8,
    })).toBe(`revenue < 7.8`);
  });
  it('should implement a greater_than operator', async () => {
    expect(sqlFromRowFilter({
      column: 'revenue',
      operator: 'greater_than',
      value: 8.7,
    })).toBe(`revenue > 8.7`);
  });
  it('should implement a less_than_or_equal operator', async () => {
    expect(sqlFromRowFilter({
      column: 'spend',
      operator: 'less_than_or_equal',
      value: 0.59,
    })).toBe(`spend <= 0.59`);
  });
  it('should implement a greater_than_or_equal operator', async () => {
    expect(sqlFromRowFilter({
      column: 'spend',
      operator: 'greater_than_or_equal',
      value: -1,
    })).toBe(`spend >= -1`);
  });
  it('should implement a contains operator', async () => {
    expect(sqlFromRowFilter({
      column: 'tag',
      operator: 'contains',
      value: 'stuff',
    })).toBe(`tag ilike '%stuff%'`);
  });
  it('should implement a starts_with operator', async () => {
    expect(sqlFromRowFilter({
      column: 'tag',
      operator: 'starts_with',
      value: 'stuff',
    })).toBe(`tag ilike 'stuff%'`);
  });
  it('should implement a ends_with operator', async () => {
    expect(sqlFromRowFilter({
      column: 'tag',
      operator: 'ends_with',
      value: 'stuff',
    })).toBe(`tag ilike '%stuff'`);
  });
  it('should implement an "or" operator', async () => {
    expect(sqlFromRowFilter({
      or: [
        {
          column: 'tag',
          operator: 'starts_with',
          value: 'stu',
        },
        {
          column: 'tag',
          operator: 'ends_with',
          value: 'ff',
        },
      ]
    })).toBe(`(tag ilike 'stu%' OR tag ilike '%ff')`);
  });
  it('should implement an "and" operator', async () => {
    expect(sqlFromRowFilter({
      and: [
        {
          column: 'tag',
          operator: 'starts_with',
          value: 'stu',
        },
        {
          column: 'tag',
          operator: 'ends_with',
          value: 'ff',
        },
      ]
    })).toBe(`(tag ilike 'stu%' AND tag ilike '%ff')`);
  });
  it('should support operator nesting', async () => {
    expect(sqlFromRowFilter({
      and: [
        {
          or: [
            {
              column: 'spend',
              operator: 'greater_than',
              value: 7000,
            },
            {
              column: 'revenue',
              operator: 'greater_than',
              value: 2000,
            },
          ]
        },
        {
          column: 'tag',
          operator: 'ends_with',
          value: 'ff',
        },
      ]
    })).toBe(`((spend > 7000 OR revenue > 2000) AND tag ilike '%ff')`);
  });
});

describe('sqlFromCases', () => {
  it('should implement an is_null operator', async () => {
    let result = `CASE WHEN product_name is null THEN 'App Unknown' ELSE product_name END`;
    let cases = [
      {
        when: { operator: 'is_null', column: 'product_name', value: null },
        then: { value: 'App Unknown' }
      },
      {
        default: { column: 'product_name' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement an is_not_null operator', async () => {
    let result = `CASE WHEN product_name is not null THEN 'App Unknown' ELSE product_name END`;
    let cases = [
      {
        when: { operator: 'is_not_null', column: 'product_name', value: null },
        then: { value: 'App Unknown' }
      },
      {
        default: { column: 'product_name' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement an equal operator', async () => {
    let result = `CASE WHEN product_name = 'Goalie' THEN 'Goalie!' ELSE product_name END`;
    let cases = [
      {
        when: { operator: 'equal', column: 'product_name' , value: 'Goalie' },
        then: { value: 'Goalie!' }
      },
      {
        default: { column: 'product_name' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement an equal operator', async () => {
    let result = `CASE WHEN product_name <> 'Goalie' THEN 'Not Goalie!' ELSE product_name END`;
    let cases = [
      {
        when: { operator: 'not_equal', column: 'product_name' , value: 'Goalie' },
        then: { value: 'Not Goalie!' }
      },
      {
        default: { column: 'product_name' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement a less_than operator', async () => {
    let result = `CASE WHEN spend < 1000 THEN 'low' ELSE 'high' END`;
    let cases = [
      {
        when: { operator: 'less_than', column: 'spend' , value: 1000 },
        then: { value: 'low' }
      },
      {
        default: { value: 'high' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement a greater_than operator', async () => {
    let result = `CASE WHEN spend > 1000 THEN 'high' ELSE 'low' END`;
    let cases = [
      {
        when: { operator: 'greater_than', column: 'spend' , value: 1000 },
        then: { value: 'high' }
      },
      {
        default: { value: 'low' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement a greater_than_or_equal operator', async () => {
    let result = `CASE WHEN spend >= 1000 THEN 'high' ELSE 'low' END`;
    let cases = [
      {
        when: { operator: 'greater_than_or_equal', column: 'spend' , value: 1000 },
        then: { value: 'high' }
      },
      {
        default: { value: 'low' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement a less_than_or_equal operator', async () => {
    let result = `CASE WHEN spend <= 1000 THEN 'low' ELSE 'high' END`;
    let cases = [
      {
        when: { operator: 'less_than_or_equal', column: 'spend' , value: 1000 },
        then: { value: 'low' }
      },
      {
        default: { value: 'high' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement a greater_than_or_equal operator', async () => {
    let result = `CASE WHEN spend >= 1000 THEN 'high' ELSE 'low' END`;
    let cases = [
      {
        when: { operator: 'greater_than_or_equal', column: 'spend' , value: 1000 },
        then: { value: 'high' }
      },
      {
        default: { value: 'low' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement a contains operator', async () => {
    let result = `CASE WHEN campaign_tag ilike '%cool%' THEN 'nice' ELSE 'nope' END`;
    let cases = [
      {
        when: { operator: 'contains', column: 'campaign_tag' , value: 'cool' },
        then: { value: 'nice' }
      },
      {
        default: { value: 'nope' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement a starts_with operator', async () => {
    let result = `CASE WHEN campaign_tag ilike 'cool%' THEN 'nice' ELSE 'nope' END`;
    let cases = [
      {
        when: { operator: 'starts_with', column: 'campaign_tag' , value: 'cool' },
        then: { value: 'nice' }
      },
      {
        default: { value: 'nope' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should implement an ends_with operator', async () => {
    let result = `CASE WHEN campaign_tag ilike '%cool' THEN 'nice' ELSE 'nope' END`;
    let cases = [
      {
        when: { operator: 'ends_with', column: 'campaign_tag' , value: 'cool' },
        then: { value: 'nice' }
      },
      {
        default: { value: 'nope' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });

  it('should convert a complex case statement with nested logic.', async () => {
    let result = `CASE WHEN platform <> '' THEN platform WHEN (platform = '' AND campaign_name ilike '%ios%') THEN 'ios' WHEN (platform = '' AND (campaign_name ilike '%android%' OR campaign_name like '%_ADR_%')) THEN 'android' ELSE 'other' END`;
    let cases = [
      {
        when: { operator: 'not_equal', column: 'platform', value: '' },
        then: { column: 'platform' }
      },
      {
        and: [
          { when: { operator: 'equal', column: 'platform', value: '' }},
          { when: { operator: 'contains', column: 'campaign_name', value: 'ios' }},
        ],
        then: { value: 'ios' }
      },
      {
        and: [
          { when: { operator: 'equal', column: 'platform', value: '' }},
          {
            or: [
              { when: { operator: 'contains', column: 'campaign_name', value: 'android' }},
              { when: { operator: 'contains', column: 'campaign_name', value: '_ADR_', options: { caseSensitive: true }}},
            ],
          },
        ],
        then: { value: 'android' }
      },
      {
        default: { value: 'other' }
      }
    ];
    expect(sqlFromCases(cases)).toBe(result);
  });
});

