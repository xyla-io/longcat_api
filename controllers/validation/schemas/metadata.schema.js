const identifierSchema = {
  type: 'string',
  minLength: 1,
};

function buildBasicMetadata(templateType) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['identifier', 'templateType'],
    properties: {
      templateType: { enum: [templateType] },
      identifier: { type: 'string', minLength: 1 },
      version: { type: 'number' },
    },
  }
}

/**
 * Generate a template metadata validation schema.
 * 
 * @param {string} templateType - The type of the template; pass null to validate any template type
 * @return {object} A template metadata validation schema.
 */
function buildMetadataSchema({ templateType=null }) {
  return {
    type: 'object',
    required: [
      'templateType',
      'identifier',
      'version',
      'parentPath',
      'parentVersion',
      'more',
    ],
  properties: {
      templateType: {
        type: 'string',
        enum: (templateType === null) ? [
          'master',
          'deck',
          'group',
          'big_number',
        ] : [templateType],
      },
      identifier: identifierSchema,
      version: {
        type: 'number',
      },
      parentPath: {
        type: 'string',
        minLength: 1,
      },
      parentVersion: {
        type: 'number',
      },
      more: {
        type: 'object',
        properties: {
          mergePath: {
            type: 'string',
            minLength: 1,
          },
          merge: {
            type: 'object',
            properties: {
              type: 'string',
            },
            maxProperties: 1024,
          },
        },
      },
    },
  };
}

const metadataSchema = buildMetadataSchema({});

module.exports.metadataSchema = metadataSchema;
module.exports.buildBasicMetadata = buildBasicMetadata;
module.exports.buildMetadataSchema = buildMetadataSchema;