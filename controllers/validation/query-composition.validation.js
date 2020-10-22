const { columnOperatorKeys } = require('../../modules/query');
const { Validating, addSchema } = require('../../modules/validating');
const { rowFiltersSchema } = require('./schemas/row-filter.schema')

const queryIntervalPropertySchema = { oneOf: [
  { type: 'null' },
  {
    type: 'object',
    additionalProperties: false,
    required: ['value', 'unit'],
    properties: {
      unit: { enum: ['day'] },
      value: { type: 'number' },
    },
  },
  {
    type: 'object',
    additionalProperties: false,
    required: ['value', 'unit'],
    properties: {
      unit: { enum: ['range'] },
      value: {
        type: 'object',
        additionalProperties: false,
        required: ['start', 'end'],
        properties: {
          start: {
            type: 'string', format: 'date-time',
          },
          end: {
            type: 'string', format: 'date-time',
          }
        }
      },
    },
  }
]};

const queryParametersSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    interval: queryIntervalPropertySchema,
    rowFilters: rowFiltersSchema
  },
};
 
const columnCaseWhenOptionsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    caseSensitive: {
      type: 'boolean',
    }
  },
};

const columnCaseWhenPropertySchema = {
  type: 'object',
  required: ['operator', 'column', 'value'],
  properties: {
    operator: { enum: columnOperatorKeys },
    column: { type: 'string', minLength: 1 },
    options: columnCaseWhenOptionsSchema,
    value: {
      oneOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'null' },
      ]
    },
  },
};

const columnCaseThenPropertySchema = {
  type: 'object',
  oneOf: [
    { required: ['value'] },
    { required: ['column'] },
  ],
  additionalProperties: false,
  minProperties: 1,
  properties: {
    value: {
      // this is a value that will be wrapped in quotes in the raw SQL
      oneOf: [
        { type: 'string' },
        { type: 'number' },
      ],
    },
    column: {
      // this is a column reference that will not be wrapped in quotes in the raw SQL
      type: 'string',
      minLength: 1,
    },
  },
};

const columnCaseAndOrPropertySchema = {
  type: 'array',
  minItems: 2,
  items: {
    '$ref': '/ColumnNestedCaseSchema'
  },
};

const columnCaseDefaultSchema = {
  type: 'object',
  required: ['default'],
  additionalProperties: false,
  properties: {
    default: columnCaseThenPropertySchema,
  },
};

const columnNestedCaseSchema = {
  id: '/ColumnNestedCaseSchema',
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['when'],
      properties: {
        when: columnCaseWhenPropertySchema,
      },
    },
    {
      type: 'object',
      required: ['and'],
      additionalProperties: false,
      properties: {
        and: columnCaseAndOrPropertySchema,
      },
    },
    {
      type: 'object',
      required: ['or'],
      additionalProperties: false,
      properties: {
        or: columnCaseAndOrPropertySchema,
      },
    },
  ],
};

const columnTopLevelCaseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    when: columnCaseWhenPropertySchema,
    and: columnCaseAndOrPropertySchema,
    or: columnCaseAndOrPropertySchema,
    then: columnCaseThenPropertySchema,
  },
  required: ['then'],
  oneOf: [
    { required: ['when'] },
    { required: ['and'] },
    { required: ['or'] },
  ]
};

const queryColumnSchema = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        cases: {
          required: true,
          type: 'array',
          minItems: 2,
          items: {
            oneOf: [
              columnTopLevelCaseSchema,
              columnCaseDefaultSchema,
            ],
          },
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        sql: {
          minLength: 1,
          required: true,
          type: 'string',
        },
      },
    }
  ],
};

const queryCompositionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['table', 'columns', 'queryType', 'parameters'],
  properties: {
    table: {
      type: 'string',
      minLength: 1,
    },
    columns: {
      type: 'object',
      minProperties: 1,
      maxProperties: 128,
      additionalProperties: queryColumnSchema,
    },
    parameters: queryParametersSchema,
    queryType: { enum: ['cube'] }
  },
};

const CreateSQLQueryValidator = Validating.model({
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
    },
    composition: queryCompositionSchema,
    description: {
      type: 'string',
      minLength: 1,
    },
  },
  additionalProperties: false,
  oneOf: [
    { required: ['query'] },
    { required: ['composition'] },
  ],
});

addSchema(columnNestedCaseSchema, '/ColumnNestedCaseSchema');

module.exports.CreateSQLQueryValidator = CreateSQLQueryValidator;
module.exports.queryParametersSchema = queryParametersSchema;
module.exports.queryIntervalPropertySchema = queryIntervalPropertySchema;
