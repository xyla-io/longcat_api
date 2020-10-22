const express = require('express');
const router = express.Router();
const acl = new(require('../modules/acl'))();
const {
  handleError,
  NotFoundError,
  DuplicateKeyError,
} = require('../modules/error');
const {
  Validating,
  validateParametersMiddleware,
} = require('../modules/validating');
const {
  templateValidationModel,
} = require('./validation/template.validation');
const {
  locationValidationErrors,
} = require('./validation/validation-utilities');
const Template = require('../models/template.model');
const Access = require('../modules/access');
const { sharedPathLock } = require('../modules/lock');

let PopulateTemplate = Validating.model({
  type: 'object',
  properties: {
    paths: {
      type: 'array',
      minItems: 1,
      maxItems: 1024,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 65536,
      }
    },
    recursive: {
      type: 'boolean',
    },
  },
  required: ['paths'],
  additionalProperties: false,
});

let UpdateTemplate = Validating.model({
  type: 'object',
  properties: {
    delete: {
      type: 'array',
      maxItems: 1024,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 65536,
      }
    },
    create: {
      type: 'object',
      maxProperties: 1024,
      items: {
        type: 'object',
        maxProperties: 1024,
      }
    },
    replace: {
      type: 'object',
      maxProperties: 1024,
      items: {
        type: 'object',
        maxProperties: 1024,
      }
    },
  },
  minProperties: 1,
  additionalProperties: false,
}, instance => {
  let deletePaths = (!!instance.delete) ? Array.from(new Set(instance.delete)).sort() : [];
  let createTemplates = (!!instance.create) ? Object.assign({}, instance.create) : {};
  let replaceTemplates = (!!instance.replace) ? Object.assign({}, instance.replace) : {};

  let deleteAndCreatePaths = deletePaths.filter(p => Object.keys(createTemplates).includes(p));
  let deleteAndReplacePaths = deletePaths.filter(p => Object.keys(replaceTemplates).includes(p));
  let createAndReplacePaths = Object.keys(createTemplates).filter(p => Object.keys(replaceTemplates).includes(p)).sort();

  let errors = [];
  errors.concat(deleteAndCreatePaths.map(path => new Error(`Parameters delete and create contain the same path: ${path}`)));
  errors.concat(deleteAndReplacePaths.map(path => new Error(`Parameters delete and replace contain the same path: ${path}`)));
  errors.concat(createAndReplacePaths.map(path => new Error(`Parameters create and replace contain the same path: ${path}`)));

  let templateValidationErrors = [
    'create', 
    'replace',
  ].map(key => locationValidationErrors({ instance: instance, modelFactory: templateValidationModel, location: [key], isCollection: true })).flat().filter(e => e !== undefined);
  errors = errors.concat(templateValidationErrors);

  return errors;
});

let FindTemplate = Validating.model({
  type: 'object',
  properties: {
    templateTypes: {
      type: 'array',
      maxItems: 1024,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 1024,
      }
    },
    excludeTemplateTypes: {
      type: 'array',
      maxItems: 1024,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 1024,
      }
    },
    pathPattern: {
      type: 'string',
      minLength: 1,
      maxLength: 65536,
    },
  },
  additionalProperties: false,
});

acl.allow([
  {
    roles: [acl.userRoles.super],
    allows: [
      { resources: ['/find'], permissions: ['post'] },
    ]
  },
  {
    roles: [acl.roles.user],
    allows: [
      { resources: ['/populate'], permissions: ['post'] },
      { resources: ['/update'], permissions: ['post'] },
    ]
  },
]);

/**
 * @api {post} /populate retrieve and populate a list of templates
 * @apiGroup Templates
 * @apiName PopulateTemplates
 * @apiParam {Array} paths The template paths to populate
 * @apiParam {Boolean} recursive Whether to populate related templates
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Object} templates A map of template paths to populated template objects
 */
router.post(
  '/populate',
  acl.middleware(),
  validateParametersMiddleware(PopulateTemplate),
  async (req, res) => {
    const parameters = req.body;
    let templatesByPath = {};
    let templatePermissionError = null;
    async function getTemplates(paths, recursive) {
      let populatedPaths = new Set(Object.keys(templatesByPath));
      let pathsToPopulate = paths.filter(path => !populatedPaths.has(path)).sort();

      // TODO: Handle global template storage
      pathsToPopulate = pathsToPopulate.filter(path => Access.componentsFromPath(path).shift() !== 'global');

      pathsToPopulate.forEach(path => {
        templatePermissionError = Access.userPermissionError(req.user, path, Access.actions.view);
        if (templatePermissionError) { throw templatePermissionError; }
      });
      if (!pathsToPopulate.length) { return; }

      let templates = await Template.getByPaths(pathsToPopulate);
      let remainingPaths = new Set(pathsToPopulate);
      templates.forEach(template => {
        if (!remainingPaths.has(template.path)) { throw new Error('Unexpected template populated.'); }
        remainingPaths.delete(template.path);
        templatesByPath[template.path] = template.sanitizedForUser(req.user);
      });
      if (remainingPaths.size) { throw new NotFoundError('template', Array.from(remainingPaths).sort().shift()); }

      if (recursive) {
        let relationships = templates.reduce((a, t) => a.concat(t.relationships), []);
        await getTemplates(relationships, recursive);
      }
    }
    try {
      await getTemplates(parameters.paths, !!parameters.recursive);
      res.status(200).json({
        success: true,
        message: `${Object.keys(templatesByPath).length} templates populated ${(!!parameters.recursive) ? 'recursively ' : ''}(global templates excluded).`,
        templates: templatesByPath,
      });
    } catch(error) {
      if (templatePermissionError) { return handleError(res, 403, 'Permission denied.', templatePermissionError); }
      return handleError(res, 500, 'Failed to populate templates', error);  
    }
  }
);

/**
 * @api {post} /update create, delete, and replace multiple templates
 * @apiGroup Templates
 * @apiName UpdateTemplates
 * @apiParam {Array} delete Template paths to delete
 * @apiParam {Object} create A map of paths to template objects to create
 * @apiParam {Object} replace A map of paths to template objects to replace
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Object} templates A map containing `delete`, `create`, and `replace` keys mapping to the paths deleted and objects created and replaced.
 */
router.post(
  '/update',
  acl.middleware(),
  validateParametersMiddleware(UpdateTemplate),
  async (req, res) => {
    const parameters = req.body;
    let templatePermissionError = null;
    let lockResult = null;
    try {
      let deletePaths = (!!parameters.delete) ? Array.from(new Set(parameters.delete)).sort() : [];
      let createTemplates = (!!parameters.create) ? Object.assign({}, parameters.create) : {};
      let replaceTemplates = (!!parameters.replace) ? Object.assign({}, parameters.replace) : {};

      // Convert delete and create operations into replace operations
      // if (parameters.force) {
      //   let deleteAndCreatePaths = deletePaths.filter(p => Object.keys(createTemplates).includes(p));
      //   deletePaths = deletePaths.filter(p => !deleteAndCreatePaths.includes(p));
      //   deleteAndCreatePaths.forEach(path => {
      //     if (!Object.keys(replaceTemplates).includes(path)) {
      //       replaceTemplates[path] = createTemplates[path];
      //     }
      //     delete createTemplates[path];
      //   });  
      // }

      // Check permissions
      deletePaths.forEach(path => {
        templatePermissionError = Access.userPermissionError(req.user, path, Access.actions.delete);
        if (templatePermissionError) { throw templatePermissionError; }  
      });
      Object.keys(createTemplates).sort().forEach(path => {
        templatePermissionError = Access.userPermissionError(req.user, path, Access.actions.create);
        if (templatePermissionError) { throw templatePermissionError; }  
      });
      Object.keys(replaceTemplates).sort().forEach(path => {
        templatePermissionError = Access.userPermissionError(req.user, path, Access.actions.edit);
        if (templatePermissionError) { throw templatePermissionError; }  
      });

      // Lock paths
      let lockPaths = Array.from(new Set(deletePaths.concat(Object.keys(createTemplates)).concat(Object.keys(replaceTemplates)))).sort();
      lockResult = sharedPathLock.lock({ paths: lockPaths });
      if (!lockResult.lockID) {
        return handleError(res, 423, 'Failed to lock update paths.', new Error(`${lockResult.paths.length} target paths (${lockResult.paths.join(', ')}) are locked until ${lockResult.expire.toUTCString()}`));
      }

      // Retrieve existing templates
      let populatePaths = deletePaths.concat(Object.keys(createTemplates)).concat(Object.keys(replaceTemplates));
      let existingTemplates = Array.from(new Set(await Template.getByPaths(populatePaths))).sort();
      let existingPaths = existingTemplates.map(t => t.path);
      let existingTemplatesByPath = {};
      existingTemplates.forEach(t => existingTemplatesByPath[t.path] = t);
  
      // Check that expected templates and only expected templates exist
      Object.keys(createTemplates).sort().forEach(path => {
        if (existingPaths.includes(path)) {
          throw new DuplicateKeyError('template', path);
        }
      });
      deletePaths.concat(Object.keys(replaceTemplates)).sort().forEach(path => {
        if (!existingPaths.includes(path)) {
          throw new NotFoundError('template', path);
        }
      });
      
      // Create new template models
      let existingVersions = {};
      function makeTemplate(path, properties, replace) {
        let doc = Object.assign({}, properties);
        delete doc._id;
        let template;
        if (replace) {
          template = existingTemplatesByPath[path];
          existingVersions[path] = template.toObject();
          template.set(doc);
        } else {
          template = new Template(doc);
        }
        template.path = path;
        return template;
      }
      let create = Object.keys(createTemplates).sort().map(path => makeTemplate(path, createTemplates[path], false));
      let replace = Object.keys(replaceTemplates).sort().map(path => makeTemplate(path, replaceTemplates[path], true));

      try {
        // Save and delete templates
        for (template of replace) {
          await template.save();
        }
        for (template of create) {
          await template.save();
        }
        if (deletePaths.length) {
          await Template.deleteByPaths(deletePaths);
        }
      } catch(error) {
        // Roll back changes on error
        Object.keys(existingVersions).forEach(path => existingTemplatesByPath[path].set(existingVersions[path]));
        if (Object.keys(createTemplates).length) {
          Template.deleteByPaths(Object.keys(createTemplates).sort());
        }
        for (template of existingTemplates) {
          await template.save();
        }
        throw error;
      }
      let created = {};
      create.forEach(t => created[t.path] = t.sanitizedForUser(req.user));
      let replaced = {};
      replace.forEach(t => replaced[t.path] = t.sanitizedForUser(req.user));
      res.status(200).json({
        success: true,
        message: `${deletePaths.length} templates deleted, ${create.length} templates created, ${replace.length} templates replaced.`,
        templates: {
          deleted: deletePaths,
          created: created,
          replaced: replaced,
        },
      });
    } catch(error) {
      if (templatePermissionError) { return handleError(res, 403, 'Permission denied.', templatePermissionError); }
      return handleError(res, 500, 'Failed to update templates', error);  
    } finally {
      if (lockResult) {
        sharedPathLock.unlock({ lockID: lockResult.lockID });
      }
    }
  }
);

/**
 * @api {post} /find search for templates
 * @apiGroup Templates
 * @apiName FindTemplates
 * @apiParam {Array} templateTypes Template types to find
 * @apiParam {string} pathPattern A regular expression to match template paths
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Array} templatePaths An array containing template paths that were found.
 */
router.post(
  '/find',
  acl.middleware(),
  validateParametersMiddleware(FindTemplate),
  async (req, res) => {
    const parameters = req.body;
    try {
      let paths = await Template.search(parameters);
      paths = paths.filter(path => Access.userPermissionError(req.user, path, Access.actions.list) === null);
      res.status(200).json({
        success: true,
        message: `${paths.length} templates found.`,
        templatePaths: paths,
      });
    } catch(error) {
      return handleError(res, 500, 'Failed to find templates', error);  
    }
  }
);

module.exports = router;
