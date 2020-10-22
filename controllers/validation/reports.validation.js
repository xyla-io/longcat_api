const { Validating } = require('../../modules/validating');
const trieops = require('../../modules/trieops');
const { 
  createModeEmbedSchema,
  createPeriscopeEmbedSchema,
  createXylaEmbedSchema,
} = require('./embeds.validation');
const { dashboardContentSchema, gridContentSchema } = require('./dashboard.validation');

const embedContentSchema = {
  type: 'object',
  properties: {
    embed: createXylaEmbedSchema,
  },
  required: ['embed'],
  additionalProperties: false,
};

const props = {
  path: {
    type: 'string',
    minLength: 1,
  },
  displayName: {
    type: 'string',
    minLength: 1,
  },
  reportVersion: {
    type: 'integer',
    minimum: 1,
  },
  content: {
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: {
        type: 'object',
        required: true,
        maxProperties: 64,
        additionalProperties: {
          type: 'object',
          properties: {
            embed: createModeEmbedSchema,
          },
          required: ['embed'],
          additionalProperties: false,
        },
      },
      periscope: {
        type: 'object',
        required: true,
        maxProperties: 64,
        additionalProperties: {
          type: 'object',
          properties: {
            embed: createPeriscopeEmbedSchema,
          },
          required: ['embed'],
          additionalProperties: false,
        },
      },
      xyla: {
        type: 'object',
        required: true,
        maxProperties: 64,
        additionalProperties: false,
        additionalProperties: {
          type: 'object',
        }
      },
      layout: {
        type: 'object',
        required: true,
        additionalProperties: {
          type: 'object',
          additionalProperties: false,
          minSize: 1,
          properties: {
            orientation: {
              type: 'string',
              enum: ['horizontal', 'vertical'],
              required: true
            },
            layoutIDs: {
              type: 'array',
              items: { type: 'string' },
              required: true
            }
          },
        },
      },
    },
  },
};

function Creation(params) {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      date: {
        type: 'string',
      },
      path: props.path,
      displayName: props.displayName,
      reportVersion: props.reportVersion,
      content: props.content,
    },
    required: ['displayName', 'content'],
  };
  const Validator = Validating.model(schema, (instance) => {
    console.log('running consistency');
    if (Object.keys(instance.content.xyla).length) {
      const xylaContentSchema = {
        type: 'object',
        properties: {
          content: {
            type: 'object',
            properties: {
              xyla: {
                type: 'object',
                properties: {},
              },
            },
          },  
        },
      };
      for (const [k, v] of Object.entries(instance.content.xyla)) {
        let xylaElementSchema;
        if (v.metadata && v.metadata.templateType === 'dashboard_content') {
          xylaElementSchema = dashboardContentSchema;
        } else if (v.metadata && v.metadata.templateType === 'grid_content') {
          xylaElementSchema = gridContentSchema;
        } else if (v.embed) {
          xylaElementSchema = embedContentSchema;
        } else {
          xylaElementSchema = {
            oneOf: [
              embedContentSchema,
              dashboardContentSchema,
              gridContentSchema,
            ],
          };
        }
        xylaContentSchema.properties.content.properties.xyla.properties[k] = xylaElementSchema;
      }
      const xylaValidation = Validating.validateInstance(instance, xylaContentSchema);
      if (xylaValidation.schemaResult.errors.length) {
        return xylaValidation.schemaResult.errors;
      }
    }
    const errors = [];
    let prospectiveTrie = convertReportInstanceToTrie(instance);
    let validationResult = trieops.validateTrie(prospectiveTrie);
    if (validationResult.errors !== null) {
      errors.push(JSON.stringify(validationResult.errors));
    }
    return errors;
  });
  return new Validator(params);
}

function convertReportInstanceToTrie(instance) {
  let trie = {
    leaves: [],
    nodes: [],
  };
  ['xyla', 'mode', 'periscope'].forEach(type => {
    Object.keys(instance.content[type]).forEach(uid => {
      trie.leaves.push(uid);
    });
  });
  let layoutKeys = Object.keys(instance.content.layout);
  for (let layout in instance.content.layout) {
    trie.nodes.push(instance.content.layout[layout].layoutIDs.map(id => {
      let layoutIndex = layoutKeys.indexOf(id);
      if (layoutIndex !== -1) { return layoutIndex; }
      return id;
    }));
  }
  return trie;
}

module.exports.Creation = Creation;
