const { Validating } = require('../../modules/validating');
const { displayColumnSchema } = require('./schemas/display-column.schema');
const { buildMetadataSchema } = require('./schemas/metadata.schema')
const { rowFilterSchema } = require('./schemas/row-filter.schema');
const { queryParametersSchema } = require('./query-composition.validation');

const breakdownTableTemplateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metadata', 'structure'],
  properties: {
    path: {
      type: 'string',
      minLength: 1,
    },
    metadata: buildMetadataSchema({ templateType: 'breakdown_table' }),
    queryParameters: queryParametersSchema,
    structure: {
      type: 'object',
      additionalProperties: false,
      required: ['displayColumns', 'displayBreakdownIdentifiers'],
      properties: {
        displayName: { type: 'string', minLength: 1 },
        displayColumns: {
          type: 'array',
          items: displayColumnSchema,
        },
        displayBreakdownIdentifiers: { type: 'array', items: { type: 'string', minLength: 1 } },
        options: {
          type: 'object',
          additionalProperties: false,
          properties: {
            rowFilters: {
              type: 'array',
              items: { rowFilterSchema },
            },
          }
        }
      },
    },
  },
};

const BreakdownTableTemplateValidator = Validating.model(breakdownTableTemplateSchema);

module.exports.breakdownTableTemplateSchema = breakdownTableTemplateSchema;
module.exports.BreakdownTableTemplateValidator = BreakdownTableTemplateValidator;
