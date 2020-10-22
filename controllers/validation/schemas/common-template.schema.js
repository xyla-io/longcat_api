const { metadataSchema } = require('./metadata.schema');

const referenceSchema = {
  type: 'object',
  required: ['reference'],
  properties: {
    reference: {
      type: 'string',
      minLength: 1,
    },
  },
  additionalProperties: false,
};


const genericTemplateSchema = {
  type: 'object',
  properties: {
    metadata: metadataSchema,
  },
  required: ['metadata'],
};

module.exports.referenceSchema = referenceSchema;
module.exports.genericTemplateSchema = genericTemplateSchema;