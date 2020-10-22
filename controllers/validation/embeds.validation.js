const { Validating } = require('../../modules/validating');
const { queryParametersSchema } = require('./query-composition.validation');

const signXylaSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    path: {
      type: 'string',
      minLength: 1,
    },
    queryPath: {
      type: 'string',
      minLength: 1,
    },
    queryParameters: queryParametersSchema,
  },
  required: [
    'path',
    'queryPath',
  ],
};

const createXylaEmbedSchema = JSON.parse(JSON.stringify(signXylaSchema));
createXylaEmbedSchema.properties.path.required = false;

const signModeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    path: {
      type: 'string',
      minLength: 1,
      required: true,
    },
    url: {
      type: 'string',
      minLength: 1,
      required: true,
    },
  },
};

const createModeEmbedSchema = JSON.parse(JSON.stringify(signModeSchema));
createModeEmbedSchema.properties.path.required = false;

const periscopeFilterValueSubSchema = {
  anyOf: [
    { type: 'string' },
    {
      type: 'object',
      maxProperties: 16,
      additionalProperties: {
        anyOf: [
          { type: 'string' },
          { type: 'number' },
        ],
      },
    },
  ]
};

const signPeriscopeSchema = {
  type: 'object',
  required: true,
  additionalProperties: false,
  properties: {
    path: {
      type: 'string',
      required: true,
    },
    dashboardID: {
      type: 'integer',
      required: true,
    },
    chartID: {
      type: 'integer',
      required: false,
    },
    params: {
      type: 'object',
      additionalProperties: false,
      required: true,
      properties: {
        visible: {
          type: 'array',
          required: true,
          items: {
            type: 'string',
            minLength: 1
          },
        },
        filters: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              'name': { type: 'string' },
              'value': periscopeFilterValueSubSchema,
              'group': { type: 'string' },
            },
            required: ['name', 'value'],
          },
        },
        daterange: periscopeFilterValueSubSchema,
        aggregation: periscopeFilterValueSubSchema,
      },
    }
  },
};

const createPeriscopeEmbedSchema = JSON.parse(JSON.stringify(signPeriscopeSchema));
createPeriscopeEmbedSchema.properties.path.required = false; 

const signDataDragonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    companyIdentifier: {
      type: 'string',
      minLength: 1,
      required: true,
    },
    apiOnly: {
      type: 'boolean',
      required: false,
    }
  },
};

function Signing(params) {
  let schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: {
        required: false,
        type: 'object',
        maxProperties: 64,
        additionalProperties: signModeSchema,
      },
      periscope: {
        required: false,
        type: 'object',
        maxProperties: 64,
        additionalProperties: signPeriscopeSchema,
      },
      xyla: {
        required: false,
        type: 'object',
        maxProperties: 64,
        additionalProperties: signXylaSchema,
      },
      datadragon: {
        required: false,
        type: 'object',
        maxProperties: 64,
        additionalProperties: signDataDragonSchema,
      },
    },
  };
  const Validator = Validating.model(schema);
  return new Validator(params);
}

module.exports.Signing = Signing;
module.exports.createModeEmbedSchema = createModeEmbedSchema;
module.exports.createPeriscopeEmbedSchema = createPeriscopeEmbedSchema;
module.exports.createXylaEmbedSchema = createXylaEmbedSchema;
