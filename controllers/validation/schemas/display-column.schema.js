const { displayFormatEnumValues } = require('./display-format.schema');
const { rowFilterSchema } = require('./row-filter.schema');

const displayColumnSchema = {
  type: 'object',
  required: ['uid', 'identifier', 'parameters'],
  additionalProperties: false,
  properties: {
    uid: { type: 'string', minLength: 1 },
    identifier: { type: 'string', minLength: 1 },
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        userDisplayName: { type: 'string', minLength: 1 },
        inscriptionDisplayName: { type: 'string', minLength: 1 },
        format: { enum: displayFormatEnumValues },
        rowFilters: {
          type: 'array',
          items: { rowFilterSchema },
        },
      },
    },
  },
};

module.exports.displayColumnSchema = displayColumnSchema;