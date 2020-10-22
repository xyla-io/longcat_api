const { Validating, addSchema } = require('../../modules/validating');
const { rowFiltersSchema, variableRowFiltersSchema } = require('./schemas/row-filter.schema');
const { displayFormatEnumValues } = require('./schemas/display-format.schema');
const { buildMetadataSchema, buildBasicMetadata  } = require('./schemas/metadata.schema');

const templateColumnOptionsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    format: { enum: displayFormatEnumValues },
    rowFilters: rowFiltersSchema,
    variableRowFilters: variableRowFiltersSchema,
  },
};

var unionTemplateColumnSchema = {
  anyOf: [
    buildTemplateSumColumnSchema(),
    buildTemplateQuotientColumnSchema(),
    buildTemplateCountColumnSchema(),
    buildTemplateReferenceColumnSchema(),
  ],
};

function buildColumnMetadata(columnType) {
  const metadata = buildBasicMetadata('column');
  metadata.properties.columnType = { enum: [columnType] };
  metadata.required.push('columnType');
  return metadata;
}

function buildBaseColumnSchema(columnType) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['metadata', 'displayName', 'options'],
    properties: {
      metadata: buildColumnMetadata(columnType),
      displayName: { type: 'string', minLength: 1 },
      options: templateColumnOptionsSchema,
    },
  };
}

function buildTemplateSumColumnSchema() {
  const schema = buildBaseColumnSchema('sum');
  schema.properties.sumColumn = { type: 'string', minLength: 1 };
  schema.required.push('sumColumn');
  return schema;
};

function buildTemplateQuotientColumnSchema() {
  const schema = buildBaseColumnSchema('quotient');
  schema.properties.denominatorTemplateColumn = { $ref: '/UnionTemplateColumnSchema' };
  schema.required.push('denominatorTemplateColumn');
  schema.properties.numeratorTemplateColumn = { $ref: '/UnionTemplateColumnSchema' };
  schema.required.push('numeratorTemplateColumn');
  return schema;
}

function buildTemplateCountColumnSchema() {
  const schema = buildBaseColumnSchema('count');
  schema.properties.countColumn = { type: 'string', minLength: 1 };
  schema.required.push('countColumn');
  schema.properties.countValue = { type: 'string', minLength: 1 };
  schema.required.push('countValue');
  return schema;
}

function buildTemplateReferenceColumnSchema() {
  let metadata = buildColumnMetadata('reference');
  metadata.properties.reference = { type: 'string', minLength: 1 };
  metadata.required.push('reference');
  delete metadata.properties.identifier;
  metadata.required.splice(metadata.required.findIndex(item => item === 'identifier'), 1);
  return {
    type: 'object',
    additionalProperties: false,
    required: ['metadata'],
    properties: {
      metadata,
    },
  };
}

addSchema(unionTemplateColumnSchema, '/UnionTemplateColumnSchema');

const columnCategorySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metadata', 'displayName', 'columnIdentifiers'],
  properties: {
    metadata: buildBasicMetadata('column_category'),
    displayName: { type: 'string', minLength: 1 },
    columnIdentifiers: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
};

const generateColumnReferenceSchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  maxProperties: 1,
  properties: {
    tag: {
      type: 'string',
      minLength: 1,
    },
    template: {
      type: 'string',
      minLength: 1,
    }
  },
};

const generateTemplateColumnSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'tag',
    'inscribeDisplayName',
    'columnType',
  ],
  properties: {
    tag: {
      type: 'string',
      minLength: 1,
    },
    inscribeDisplayName: {
      type: 'string',
      minLength: 1,
    },
    columnType: {
      type: 'string',
      enum: [
        'sum',
        'quotient',
      ]
    },
    sumColumn: {
      type: 'string',
      minLength: 1,
    },
    numeratorReference: generateColumnReferenceSchema,
    denominatorReference: generateColumnReferenceSchema,
    options: templateColumnOptionsSchema,
  },
};

const dynamicColumnCategorySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'metadata',
    'columnCategoryForEach'
  ],
  properties: {
    metadata: buildBasicMetadata('dynamic_column_category'),
    columnCategoryForEach: {
      type: 'object',
      additionalProperties: false,
      required: [
        'distinctValuesColumn',
        'inscribeDisplayName',
        'generateTemplateColumns',
      ],
      properties: {
        distinctValuesColumn: {
          type: 'string',
          minLength: 1,
        },
        inscribeDisplayName: {
          type: 'string',
          minLength: 1,
        },
        generateTemplateColumns: {
          type: 'array',
          items: generateTemplateColumnSchema,
          maxItems: 1024,
        },
      },
    },
  },
};

const templateBreakdownSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metadata', 'displayName', 'groupColumn', 'descendantIdentifiers'],
  properties: {
    metadata: buildBasicMetadata('breakdown'),
    displayName: { type: 'string', minLength: 1 },
    groupColumn: { type: 'string', minLength: 1 },
    descendantIdentifiers: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
};

const masterTemplateSchema = {
  type: 'object',
  additionalProperties: false,
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
    metadata: buildMetadataSchema({ templateType: 'master' }),
    structure: {
      type: 'object',
      additionalProperties: false,
      required: [
        'defaultDisplayName',
        'columnCategories',
        'dynamicColumnCategories',
        'templateBreakdowns',
        'templateColumns',
      ],
      properties: {
        defaultDisplayName: {
          type: 'string',
          minLength: 1,
        },
        columnCategories: {
          type: 'array',
          maxItems: 1024,
          items: columnCategorySchema,
        },
        dynamicColumnCategories: {
          type: 'array',
          maxItems: 1024,
          items: dynamicColumnCategorySchema,
        },
        templateBreakdowns: {
          type: 'array',
          items: { type: templateBreakdownSchema },
        }, 
        templateColumns: {
          type: 'array',
          maxItems: 1024,
          items: { $ref: '/UnionTemplateColumnSchema' },
        },       
        options: {
          type: 'object',
          additionalProperties: false,
          properties: {
            rowFilters: rowFiltersSchema,
            variableRowFilters: variableRowFiltersSchema
          },
        }
      },
    },
  },
};

addSchema(unionTemplateColumnSchema, '/UnionTemplateColumnSchema');

const MasterTemplateValidator = Validating.model(masterTemplateSchema);

module.exports.MasterTemplateValidator = MasterTemplateValidator;