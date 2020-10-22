const { Validating } = require('../../modules/validating');
const { buildMetadataSchema } = require('./schemas/metadata.schema');
const { referenceSchema } = require('./schemas/common-template.schema');
const { queryParametersSchema } = require('./query-composition.validation');

const groupTemplateSchema = {
  type: 'object',
  required: [
    'path',
    'metadata',
    'queryParameters',
    'structure',
  ],
  properties: {
    path: {
      type: 'string',
      minLength: 1,
    },
    metadata: buildMetadataSchema({ templateType: 'group' }),
    queryParameters: queryParametersSchema,
    structure: {
      type: 'object',
      required: [
        'displayName',
        'templates',
      ],
      properties: {
        displayName: {
          type: 'string',
          minLength: 1,
        },
        templates: {
          type: 'array',
          items: referenceSchema,
          maxItems: 1024,
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,};

const GroupTemplateValidator = Validating.model(groupTemplateSchema);

module.exports.groupTemplateSchema = groupTemplateSchema;
module.exports.GroupTemplateValidator = GroupTemplateValidator;
