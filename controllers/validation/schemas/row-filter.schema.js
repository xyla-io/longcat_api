const { buildBasicMetadata } = require('./metadata.schema');
const { columnOperatorKeys } = require('../../../modules/query');

var operatorChoiceSchema = {
  type: 'object',
  required: ['operator'],
  additionalProperties: false,
  properties: {
    operator: { enum: columnOperatorKeys },
    displayName: { type: 'string', minLength: 0 },
  },
};

var columnChoiceSchema = {
  type: 'object',
  required: ['column'],
  additionalProperties: false,
  properties: {
    column: { type: 'string', minLength: 1 },
    displayName: { type: 'string', minLength: 0 },
  },
};

function makeVariableChoiceConstant(choiceSchema) {
  return {
    type: 'object',
    required: ['constant'],
    additionalProperties: false,
    properties: {
      constant: choiceSchema,
    },
  };
}

function makeVariableChoiceList(choiceSchema) {
  return {
    type: 'object',
    required: ['choices'],
    additionalProperties: false,
    properties: {
      choices: {
        type: 'array',
        minItems: 1,
        maxItems: 5000,
        items: choiceSchema,
      }
    },
  };
}
function buildRowFilterSchema({ includeMetadata=false }={}) {
  const simpleRowFilter = {
    type: 'object',
    additionalProperties: true,
    required: ['column', 'operator', 'value'],
    properties: {
      column: { type: 'string', minLength: 1 },
      operator: { type: 'string', enum: columnOperatorKeys },
      value: {
        oneOf: [
          { type: 'string' },
          { type: 'number' },
          { type: 'null' },
        ]
      },
    },
  };
  if (includeMetadata) {
    simpleRowFilter.required.push('metadata');
    simpleRowFilter.properties.metadata = buildBasicMetadata('row_filter');
  }
  return simpleRowFilter;
};

const rowFilterSchema = { oneOf: [
  buildRowFilterSchema({ includeMetadata: true }),
  {
    type: 'object',
    additionalProperties: false,
    required: ['or', 'metadata'],
    properties: {
      metadata: buildBasicMetadata('row_filter'),
      or: {
        type: 'array',
        minItems: 2,
        items: buildRowFilterSchema(),
      }
    },
  },
  {
    type: 'object',
    additionalProperties: false,
    required: ['and', 'metadata'],
    properties: {
      metadata: buildBasicMetadata('row_filter'),
      and: {
        type: 'array',
        minItems: 2,
        items: buildRowFilterSchema(),
      }
    },
  }
]};

const valueChoicesSelectMinMaxSchema = {
  type: 'object',
  required: ['min', 'max'],
  additionalProperties: false,
  properties: {
    min: { type: 'number', maximum: 65535, minimum: -65535 },
    max: { type: 'number', maximum: 65535, minimum: -65535 },
  },
};

const valueChoicesSelectValuesSchema = {
  type: 'object',
  required: ['values'],
  additionalProperties: false,
  properties: {
    values: {
      type: 'array',
      minItems: 0,
      maxItems: 5000,
      items: { oneOf: [
        { type: 'number' },
        { type: 'string' },
      ]}
    },
    dynamicValues: {
      type: 'object',
      required: [ 'distinctValuesColumn', 'mergeStrategy' ],
      properties: {
        distinctValuesColumn: { type: 'string', minLength: 1 },
        mergeStrategy: { enum: ['merge'] },
      },
    }
  },
};

const valueChoicesSchema = { oneOf: [
  {
    type: 'object',
    required: ['select'],
    additionalProperties: false,
    properties: {
      select: { oneOf: [
        valueChoicesSelectMinMaxSchema,
        valueChoicesSelectValuesSchema,
      ]}
    },
  },
]};

const rowFiltersSchema = {
  type: 'array',
  maxItems: 16,
  items: rowFilterSchema,
};

const variableRowFiltersSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['metadata', 'operator', 'column', 'value'],
    properties: {
      metadata: buildBasicMetadata('variable_row_filter'),
      inscribeDisplayName: { type: 'string', minLength: 1 },
      optional: { type: 'boolean' },
      optionalName: { type: 'string', minLength: 1 },
      inscribeDisplayNameOptional: { type: 'string', minLength: 1 },
      default: { oneOf: [{ type: 'null' }, { type: rowFilterSchema }] },
      column: { oneOf: [
        makeVariableChoiceConstant(columnChoiceSchema),
        makeVariableChoiceList(columnChoiceSchema),
      ]},
      operator: { oneOf: [
        makeVariableChoiceConstant(operatorChoiceSchema),
        makeVariableChoiceList(operatorChoiceSchema),
      ]},
      value: { oneOf: [
        {
          type: 'object',
          required: ['choices'],
          properties: {
            choices: valueChoicesSchema,
          },
        },
        {
          type: 'object',
          required: ['columnChoices'],
          additionalProperties: false,
          properties: {
            columnChoices: {
              type: 'object',
              additionalProperties: valueChoicesSchema,
            },
          },
        },
      ]},
    },
  },
};

module.exports.rowFilterSchema = rowFilterSchema;
module.exports.rowFiltersSchema = rowFiltersSchema;
module.exports.variableRowFiltersSchema = variableRowFiltersSchema;