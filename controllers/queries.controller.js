const express = require('express');
const router = express.Router();
const acl = new(require('../modules/acl'))();
const {
  handleError,
  handleValidationErrors,
  NotFoundError,
  DuplicateKeyError,
  ForbiddenError,
} = require('../modules/error');
const {
  Validating,
  validateParametersMiddleware,
} = require('../modules/validating');
const Company = require('../models/company.model');
const SQLQuery = require('../models/sql-query.model');
const QueryExport = require('../models/query-export.model');
const Access = require('../modules/access');
const AlmacenAPI = require('../modules/almacen-api');
const { CreateSQLQueryValidator } = require('./validation/query-composition.validation');
const s3 = require('../modules/s3');

let CreateQueryExportParameters = Validating.model({
  type: 'object',
  properties: {
    displayName: {
      type: 'string',
      minLength: 1,
    },
    description: {
      type: 'string',
    },
    queryPath: {
      type: 'string',
    },
  },
  required: ['displayName', 'queryPath'],
  additionalProperties: false,
});

acl.allow([
  {
    roles: [acl.userRoles.super],
    allows: [
      { resources: ['/companies/:companyIdentifier/create/:identifier'], permissions: ['post'] },
      { resources: ['/companies/:companyIdentifier'], permissions: ['get'] },
      { resources: ['/:path'], permissions: ['delete'] },
      { resources: ['/companies/:companyIdentifier/exports/:identifier'], permissions: ['post'] },
      { resources: ['/exports/:path'], permissions: ['delete'] },
      { resources: ['/global/create/:identifier'], permissions: ['post'] },
      { resources: ['/global'], permissions: ['get'] },
    ]
  },
  {
    roles: [acl.roles.user],
    allows: [
      { resources: ['/companies/:companyIdentifier/exports'], permissions: ['get'] },
      { resources: ['/exports/:path'], permissions: ['get'] },
    ]
  },
]);

/**
 * @api {post} /queries/global/create/:queryIdentifier create Create a global SQL query composition 
 * @apiGroup Queries
 * @apiName CreateGlobalQuery
 * @apiParam {String} query The SQL query string to be executed when the query runs
 * @apiParam {String} composition The SQL query composition object
 * @apiParam {String} [description] A description of the query
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Object} query The query object
 */
router.post(
  '/global/create/:identifier',
  acl.middleware(),
  async (req, res) => {
    let parameters = new CreateSQLQueryValidator(req.body);
    const errors = parameters.validationErrors();
    if (errors) { return handleValidationErrors(res, errors); }
    const path = Access.pathFromComponents(['global', 'queries', req.params.identifier]);
    const query = new SQLQuery();
    if (parameters.composition) {
      parameters.composition.metadata = {
        templateType: 'query',
        queryType: parameters.composition.queryType,
        identifier: req.params.identifier,
        version: 0,
      };
    }
    Object.assign(query, parameters);
    query.path = path;
    try {
      await SQLQuery.create(query);
      res.status(201).json({
        success: true,
        message: 'Global query created.',
        query: query.sanitizedForUser(req.user),
      });
    } catch(error) {
      if (error instanceof DuplicateKeyError) {
        return error.send(res, 400, { key: 'path', value: path });
      }
      return handleError(res, 500, 'Failed to create query', error);
    }
  }
);

/**
 * @api {get} /queries/global Retrieve all global queries 
 * @apiName GetGlobalQueries
 * @apiGroup Queries
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Object} query The query object
 * @apiSuccess {String} query.path The unique SQL query pat
 * @apiSuccess {String} query.query? The SQL query string
 * @apiSuccess {Object} query.composition? The SQL composition object
 */
router.get('/global', acl.middleware(), async (req, res) => {
  try {
    const queries = await SQLQuery.getAllGlobals();
    res.json({
      success: true,
      message: 'Global queries retrieved',
      queries: queries.map(query => {
        let sanitized = query.sanitizedForUser(req.user);
        sanitized.sample = query.compose({
          schema: '<<SAMPLE>>',
        });
        return sanitized;
      }),
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to retrieve query', error);
  }
});

/**
 * @api {post} /queries/companies/:companyIdentifier/create/:queryIdentifier create Create a SQL query for a report
 * @apiGroup Queries
 * @apiName CreateQuery
 * @apiParam {String} query The SQL query string to be executed when the query runs
 * @apiParam {String} [description] A description of the query
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Object} query The query object
 */
router.post('/companies/:companyIdentifier/create/:identifier', acl.middleware(), async (req, res) => {
  const parameters = new CreateSQLQueryValidator(req.body);
  const errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }
  const path = Access.pathFromComponents(['companies', req.params.companyIdentifier, 'queries', req.params.identifier]);
  const query = new SQLQuery();
  Object.assign(query, parameters);
  query.path = path;
  try {
    await SQLQuery.create(query);
    res.status(201).json({
      success: true,
      message: 'Query created.',
      query: query.sanitizedForUser(req.user),
    });
  } catch(error) {
    if (error instanceof DuplicateKeyError) {
      return error.send(res, 400, { key: 'path', value: path });
    }
    return handleError(res, 500, 'Failed to create query', error);
  }
});

/**
 * @api {get} /queries/companies/:companyIdentifier Retrieve all company queries 
 * @apiName GetCompanyQueries
 * @apiGroup Queries
 * @apiParam {String} id Unique company identifier
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Object} query The query object
 * @apiSuccess {String} query.path The unique SQL query pat
 * @apiSuccess {String} query.query? The SQL query string
 * @apiSuccess {Object} query.composition? The SQL composition object
 */
router.get('/companies/:companyIdentifier', acl.middleware(), async (req, res) => {
  try {
    const company = await Company.getByIdentifier(req.params.companyIdentifier);
    if (!company) { 
      throw new NotFoundError('Company', req.params.companyIdentifier);
    }
    const queries = await SQLQuery.getAllByCompany(company.identifier);
    res.json({
      success: true,
      message: 'Company queries retrieved',
      queries: queries.map(query => query.sanitizedForUser(req.user)),
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to retrieve query', error);
  }
});

/**
 * @api {delete} /
 * @apiName DeleteQuery
 * @apiGroup Queries
 * @apiParam {String} path Query path to delete
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 */
router.delete('/:path', acl.middleware(), async (req, res) => {
  try {
    await SQLQuery.deleteByPath(req.params.path);
    res.json({
      success: true,
      message: 'Query deleted.'
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to delete query', error);
  }
});


/* @api {post} /queries/companies/:companyIdentifier/exports/:exportIdentifier create Create a SQL query for a report
 * @apiGroup Queries
 * @apiName CreateQueryExport
 * @apiParam {String} displayName The human-readable name of the export
 * @apiParam {String} queryPath The path of the SQLQuery reference
 * @apiParam {String} [description] A description of the export
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Object} export The query export object
 */
router.post('/companies/:companyIdentifier/exports/:identifier',
  acl.middleware(),
  Access.userPermissionMiddleware(req => Access.componentsFromPath(req.body.queryPath), Access.actions.use),
  validateParametersMiddleware(CreateQueryExportParameters),
  async (req, res) => {
    try {
      const company = await Company.getByIdentifier(req.params.companyIdentifier);
      if (!company) { throw new NotFoundError('Company', req.params.companyIdentifier); }

      const query = await SQLQuery.getByPath(req.body.queryPath);
      if (!query) { throw new NotFoundError('SQLQuery', req.body.queryPath); }
      const queryPathComponents = Access.componentsFromPath(query.path);
      if (queryPathComponents.length < 2 
        || queryPathComponents[0] !== 'companies' 
        || queryPathComponents[1] !== req.params.companyIdentifier) {
        throw new NotFoundError('SQLQuery', req.body.queryPath);
      }
      let queryExport = new QueryExport({
        displayName: req.body.displayName,
        description: req.body.description,
      });
      queryExport.query = query._id;
      const path = Access.pathFromComponents([
        'companies',
        req.params.companyIdentifier,
        'exports',
        req.params.identifier
      ]);
      queryExport.path = path;
      queryExport = await QueryExport.create(queryExport);
      res.status(201).json({
        success: true,
        message: 'Query export created.',
        export: queryExport.sanitizedForUser(req.user),
      });
    } catch (error) {
      handleError(res, 500, 'Failed to create query', error);
    }
  }
);

/**
 * @api {get} /queries/companies/:companyIdentifier/exports Retrieve all company query exports
 * @apiName GetCompanyQueryExports
 * @apiGroup Queries
 * @apiParam {String} id Unique company identifier
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Object[]} exports An array of query export objects for a company
 */
router.get('/companies/:companyIdentifier/exports',
  acl.middleware(),
  Access.userPermissionMiddleware(req => ['companies', req.params.companyIdentifier, 'exports'], Access.actions.list),
  async (req, res) => {
    try {
      const company = await Company.getByIdentifier(req.params.companyIdentifier);
      if (!company) { throw new NotFoundError('Company', req.params.companyIdentifier); }
      const queryExports = await QueryExport.getAllByCompany(company.identifier);
      res.json({
        success: true,
        message: 'Company query exports retrieved',
        exports: queryExports.map(queryExport => queryExport.sanitizedForUser(req.user)),
      });
    } catch (error) {
      return handleError(res, 500, 'Failed to retrieve query exports', error);
    }
  }
);

/**
 * @api {delete} /queries/exports/:path
 * @apiName DeleteQueryExport
 * @apiGroup Queries
 * @apiParam {String} path QueryExport path to delete
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 */
router.delete('/exports/:path',
  acl.middleware(),
  Access.userPermissionMiddleware(req => req.params.path, Access.actions.delete),
  async (req, res) => {
    try {
      await QueryExport.deleteByPath(req.params.path);
      res.json({
        success: true,
        message: 'Query export deleted.',
      });
    } catch (error) {
      return handleError(res, 500, 'Failed to delete query export', error);
    }
  }
);

/**
 * @api {get} /queries/exports/:path
 * @apiName GetQueryExport
 * @apiGroup Queries
 * @apiParam {String} path QueryExport path to delete
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {String} signedURL The signed URL to access the query export results
 */
router.get('/exports/:path',
  acl.middleware(),
  Access.userPermissionMiddleware(req => req.params.path, Access.actions.view),
  async (req, res) => {
    try {
      const pathComponents = Access.componentsFromPath(req.params.path);
      if (pathComponents.length < 2 || pathComponents[0] !== 'companies') {
        throw new ForbiddenError();
      }
      const companyIdentifier = pathComponents[1];
      const company = await Company.getByIdentifier(companyIdentifier);
      if (!company) { 
        throw new NotFoundError('Company', companyIdentifier);
      }
      let queryExport = await QueryExport.getByPath(req.params.path);
      let result = await AlmacenAPI.postQueryForCompany(company.identifier, queryExport.query.query, true);
      let signedURL = s3.getSignedUrl(result.body.s3_bucket, result.body.results_path);

      queryExport.lastExportTime = Date.now();
      queryExport.save();

      res.json({
        success: true,
        message: 'Query data successfully exported.',
        signedURL: signedURL,
      });
    } catch (error) {
      return handleError(res, 500, 'Failed to get export data', error);
    }
  }
);

module.exports = router;
