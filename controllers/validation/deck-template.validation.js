const { Validating } = require('../../modules/validating');
const { referenceSchema } = require('./schemas/common-template.schema');
const { buildMetadataSchema } = require('./schemas/metadata.schema')

const deckTemplateSchema = {
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
    metadata: buildMetadataSchema({ templateType: 'deck' }),
    structure: {
      type: 'object',
      required: [
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

const DeckTemplateValidator = Validating.model(deckTemplateSchema);

module.exports.deckTemplateSchema = deckTemplateSchema;
module.exports.DeckTemplateValidator = DeckTemplateValidator;
