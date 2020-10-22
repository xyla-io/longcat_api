const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Sanitizing = require('../modules/sanitizing');
const PathRepresentable = require('../modules/path-representable');
const Access = require('../modules/access');
const uuid = require('uuid').v4;
const { TemplateAssemblyError } = require('../modules/error');
const { TemplateMetadataSchema } = require('./schemas/template-metadata.schema');

const TemplateSchema = Schema({
  path: {
    type: String,
    required: 'Please provide a path',
    unique: true,
  },
  metadata: {
    type: TemplateMetadataSchema,
    required: true,
  },
  queryParameters: {
    type: Object,
  },
  structure: {
    type: Object,
    required: true,
  },
}, { minimize: false, strict: false });

TemplateSchema.index({ path: 1, "metadata.version": -1 });

Sanitizing.addToSchema(TemplateSchema, ['exposableProperties']);
TemplateSchema.virtual('exposableProperties').get(function() {
  return [
    'path',
    'metadata',
    'queryParameters',
    'structure',
  ];
});

PathRepresentable.addToSchema(TemplateSchema, ['path']);

/**
 * The paths of all related templates.
 */
TemplateSchema.virtual('relationships').get(function() {
  let relationships = [this.metadata.parentPath];
  switch (this.metadata.templateType) {
    case 'deck':
    case 'group':
      if (!!this.structure.templates) {
        relationships = relationships.concat(this.structure.templates.filter(v => !!v.reference).map(v => v.reference));
      }
      break;
  }
  return relationships;
});

const Template = mongoose.model('Template', TemplateSchema);

/**
 * Generate template metadata.
 * 
 * @param {string} templateType - The type of template
 * @param {string} parentPath - The path of the template's parent
 * @param {string} identifier - The specific template identifier, pass `null` to generate a unique identifier
 * @param {number} version - The template version
 * @param {number} parentVersion - The version of the template's parent
 * @param {object} more - Additional metadata specific to the template
 * @return {object} - The metadata object.
 */
Template.buildMetadata = function({ templateType, parentPath, identifier=null, version=0, parentVersion=0, more={} }) {
  if (identifier === null) {
    identifier = uuid();
  }
  if (typeof templateType !== 'string') {
    throw new TemplateAssemblyError('Missing templateType for template metadata');
  }
  if (typeof identifier !== 'string') {
    throw new TemplateAssemblyError('Missing identifier for template metadata');
  }
  if (typeof parentPath !== 'string') {
    throw new TemplateAssemblyError('Missing parentPath for template metadata');
  }
  if (typeof version !== 'number') {
    throw new TemplateAssemblyError('Missing version for template metadata');
  }
  if (typeof parentVersion !== 'number') {
    throw new TemplateAssemblyError('Missing parentVersion for template metadata');
  }
  return {
    templateType: templateType,
    identifier: identifier,
    version: version,
    parentPath: parentPath,
    parentVersion: parentVersion,
    more: Object.assign({}, more),
  };
};

/**
 * Generate a template path from the type, identifier, and an optional prefix
 * 
 * @param {string} prefixPath - An optional prefix to the path, such as the path of the object that owns the template
 * @return {string} A path constructed for the template.
 */
Template.buildTemplatePath = function({ templateType, identifier, version=null, prefixPath=null}) {
  if (typeof templateType !== 'string') {
    throw new TemplateAssemblyError('Missing templateType for template path');
  }
  if (typeof identifier !== 'string') {
    throw new TemplateAssemblyError('Missing identifier for template path');
  }
  let pathComponents = ['template', templateType, identifier];
  if (typeof prefixPath === 'string') {
    pathComponents = Access.componentsFromPath(prefixPath).concat(pathComponents);
  }
  if (typeof version === 'number') {
    pathComponents = pathComponents.concat(['version', version.toString()]);
  }
  return Access.pathFromComponents(pathComponents);
};

/**
 * Create a new global Template document.
 *
 * @param {object} metadata - Template metadata
 * @param {object} parameters - Additional template properties, such as `structure`
 * @return {object} A new Template document.
 */
Template.buildGlobalTemplate = function({ templateType, identifier, parameters }) {
  return this.buildTemplate({
    templateType: templateType,
    identifier: identifier,
    parameters: parameters,
    version: version,
    prefixPath: Access.pathFromComponents(['global']),
  });
}

/**
 * Create a new Template document for a company.
 *
 * @param {string} companyIdentifier - The identifier for the company owning the template
 * @param {object} metadata - Template metadata
 * @param {object} parameters - Additional template properties, such as `structure`
 * @return {object} A new Template document.
 */
Template.buildCompanyTemplate = function({ companyIdentifier, metadata, parameters }) {
  if (typeof companyIdentifier  !== 'string') {
    throw new TemplateAssemblyError('Missing templateType for template metadata');
  }
  let companyPrefix = Access.pathFromComponents(['companies', companyIdentifier]);
  return this.buildTemplate({
    metadata: metadata,
    parameters: parameters,
    prefixPath: companyPrefix,
  });
}

/**
 * Create a new Template document.
 * 
 * @param {object} metadata - Template metadata
 * @param {object} parameters - Additional template properties, such as `structure`
 * @param {string} prefixPath - An optional prefix to the path, such as the path of the object that owns the template
 * @return {object} A new Template document.
 */
Template.buildTemplate = function({ metadata, parameters, prefixPath=null }) {
  if (typeof metadata !== 'object') {
    throw new TemplateAssemblyError('Metadata is required for a template');
  }
  if (typeof parameters !== 'object') {
    throw new TemplateAssemblyError('Parameters are required for a template');
  }
  const template = new Template(Object.assign({}, {
    metadata: metadata,
  }, parameters));
  template.path = this.buildTemplatePath({
    templateType: metadata.templateType,
    identifier: metadata.identifier,
    prefixPath: prefixPath,
  });
  return template;
}

/**
 * Retrieve templates by their paths
 * 
 * @param {Array<string>} paths - Paths identifying templates to retrieve
 * @return {Promise<Array<Template>>} The templates retrieved.
 */
Template.getByPaths = async function(paths) {
  const templates = await Template
    .find({ path: { $in: paths } })
    .sort({ 'path': 1 });
  return templates;
};

/**
 * Delete templates by their paths
 * 
 * @param {Array<string>} paths - Paths identifying templates to delete
 * @return {Promise<object>} The delete query result.
 */
Template.deleteByPaths = async function(paths) {
  const result = await Template
    .deleteMany({ path: { $in: paths } });
  return result;
};


/**
 * Search for templates.
 * 
 * @param {Array<string>} templateTypes - Template types to filter by
 * @param {string} pathPattern - A regular expression to filter template paths
 * @return {Promise<Array<string>} The template paths found.
 */
Template.search = async function({ templateTypes=null, excludeTemplateTypes=null, pathPattern=null }) {
  let conditions = {};
  if (Array.isArray(templateTypes)) {
    conditions['metadata.templateType'] = {...conditions['metadata.templateType'], '$in': templateTypes };
  } else if (typeof templateTypes === 'string') {
    conditions['metadata.templateType'] = {...conditions['metadata.templateType'], '$in': [ templateTypes ]};
  }
  if (Array.isArray(excludeTemplateTypes)) {
    conditions['metadata.templateType'] = {...conditions['metadata.templateType'], '$nin': excludeTemplateTypes };
  }
  if (typeof pathPattern === 'string') {
    conditions.path = { '$regex': pathPattern };
  }
  const templates = await Template
    .find(conditions)
    .select({ path: 1, _id: 0 })
    .then(templates => templates.map(t => t.path));
  return templates;
};

module.exports = Template;
