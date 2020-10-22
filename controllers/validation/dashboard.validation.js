const { bigNumberTemplateSchema } = require('./big-number-template.validation');
const { breakdownTableTemplateSchema } = require('./breakdown-table-template.validation');
const { groupTemplateSchema } = require('./group-template.validation');
const { queryIntervalPropertySchema } = require('./query-composition.validation');

const gridStateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['rowGroupStates'],
  properties: {
    rowGroupStates: {
      type: 'object',
      maxProperties: 1024,
      additionalProperties: {
        type: 'boolean',
      },
    },
  },
};

const chartNodeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metadata', 'structure'],
  properties: {
    metadata: {
      type: 'object',
      required: ['templateType', 'identifier'],
      additionalProperties: false,
      properties: {
        templateType: { enum: ['chart_node'] },
        identifier: { type: 'string', minLength: 1 },
      },
    },
    structure: {
      type: 'object',
      required: ['groups', 'metrics', 'daterange'],
      additionalProperties: false,
      properties: {
        groups: {
          type: 'array',
          maxItems: 1024,
          items: {
            type: 'string',
            minLength: 1,
          },
        },
        metrics: {
          type: 'array',
          maxItems: 1024,
          items: {
            type: 'string',
            minLength: 1,
          },
        },
        filters: {
          type: 'object',
          maxProperties: 1024,
        },
        daterange: queryIntervalPropertySchema,
      },
    },
  },
}

const performanceGridSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metadata', 'structure'],
  properties: {
    metadata: {
      type: 'object',
      required: ['templateType', 'identifier'],
      additionalProperties: false,
      properties: {
        templateType: { enum: ['performance_grid'] },
        identifier: { type: 'string', minLength: 1 },
      },
    },
    structure: {
      type: 'object',
      required: ['categories', 'metrics', 'daterange', 'nodes'],
      additionalProperties: false,
      properties: {
        categories: {
          type: 'array',
          maxItems: 1024,
          items: {
            type: 'string',
            minLength: 1,
          },
        },
        metrics: {
          type: 'array',
          maxItems: 1024,
          items: {
            type: 'string',
            minLength: 1,
          },
        },
        daterange: queryIntervalPropertySchema,
        gridState: gridStateSchema,
        nodes: {
          type: 'object',
          maxProperties: 1024,
          additionalProperties: chartNodeSchema,
        },
      },
    },
  },
};

module.exports.gridContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metadata', 'structure'],
  properties: {
    metadata: {
      type: 'object',
      required: ['templateType', 'identifier'],
      additionalProperties: false,
      properties: {
        templateType: { enum: ['grid_content'] },
        identifier: { type: 'string', minLength: 1 },
      },
    },
    structure: {
      type: 'object',
      required: ['grid'],
      additionalProperties: false,
      properties: {
        grid: performanceGridSchema,
      },
    },
  },
};

module.exports.dashboardContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metadata', 'structure'],
  properties: {
    metadata: {
      type: 'object',
      required: ['templateType', 'identifier'],
      additionalProperties: false,
      properties: {
        templateType: { enum: ['dashboard_content'] },
        identifier: { type: 'string', minLength: 1 },
      },
    },
    structure: {
      type: 'object',
      required: ['elements', 'groups'],
      additionalProperties: false,
      properties: {
        elements: {
          type: 'object',
          additionalProperties: false,
          properties: {
            bigNumber: {
              type: 'object',
              required: ['templates'],
              additionalProperties: false,
              properties: {
                templates: {
                  type: 'array',
                  items: bigNumberTemplateSchema,
                },
              },
            },
            breakdownTable: {
              type: 'object',
              required: ['templates'],
              additionalProperties: false,
              properties: {
                templates: {
                  type: 'array',
                  items: breakdownTableTemplateSchema,
                },
              }
            },
          },
          required: ['bigNumber', 'breakdownTable'],
        },
        groups: {
          type: 'object',
          additionalProperties: groupTemplateSchema,
        },
      },
    },
  },
};

