const { Validating } = require('../../modules/validating');
const { displayColumnSchema } = require('./schemas/display-column.schema');
const { buildMetadataSchema } = require('./schemas/metadata.schema')

const bigNumberTemplateSchema = {
  type: 'object',
  required: [
    'path',
    'metadata',
    'structure',
  ],
  properties: {
    path: {
      type: 'string',
      minLength: 1,
    },
    metadata: buildMetadataSchema({ templateType: 'big_number' }),
    structure: {
      required: ['displayColumn', 'size'],
      properties: {
        displayColumn: displayColumnSchema,
        size: {
          type: 'string',
          enum: [
            'normal',
            'large',
          ]
        }
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

const BigNumberTemplateValidator = Validating.model(bigNumberTemplateSchema);

module.exports.bigNumberTemplateSchema = bigNumberTemplateSchema;
module.exports.BigNumberTemplateValidator = BigNumberTemplateValidator;
