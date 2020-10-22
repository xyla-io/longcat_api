const express = require('express');
const router = express.Router({ mergeParams: true });
const acl = new(require('../modules/acl'))();
const {
  handleError,
  BadRequestError,
  NotFoundError,
  DuplicateKeyError,
} = require('../modules/error');
const Company = require('../models/company.model');
const TableFeed = require('../models/feed.model').TableFeed;
const AlmacenConfig = require('../models/almacen-config.model').AlmacenConfig;
const Access = require('../modules/access');
const AlmacenAPI = require('../modules/almacen-api');
const { 
  validateParametersMiddleware,
 } = require('../modules/validating');
const s3 = require('../modules/s3');
const {
  createTableFeedParameters,
  createAlmacenConfigParameters,
  updateAlmacenConfigParameters,
} = require('./validation/companies.feeds.validation');

const xylaTablePrefix = 'xyla_custom_';

acl.allow([{
  roles: [acl.roles.user],
  allows: [
    { resources: ['/'], permissions: ['get'] },
    { resources: ['/utils/structure/csv'], permissions: ['post'] },
    { resources: ['/tables/:tableName'], permissions: ['put'] },
    { resources: ['/tables/:tableName/replace'], permissions: ['put'] },
    { resources: ['/tables/:tableName/merge'], permissions: ['patch'] },
    { resources: ['/tables/:tableName/data'], permissions: ['get'] },
    { resources: ['/tables/:tableName'], permissions: ['delete'] },
    { resources: ['/core/config'], permissions: ['get'] },
    { resources: ['/core/config'], permissions: ['patch'] },
    { resources: ['/core/config'], permissions: ['post'] },
  ],
}]);

function validateFeedTableNameMiddleware() {
  return (req, res, next) => {
    let tableName = req.params.tableName;
    if (tableName.indexOf(xylaTablePrefix) !== 0) {
      return handleError(res, 400, `Feed table names must start with '${xylaTablePrefix}'`);
    }
    next();
  }
}

router.post(
  '/utils/structure/csv', 
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'feeds', 'utils'],
    Access.actions.use
  ),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      const columnTypesResult = await AlmacenAPI.determineFeedColumnTypes(req, company.identifier);
      res.json({
        success: true,
        message: 'Feed column types determined.',
        columnTypes: columnTypesResult.body.column_types,
      });
    } catch (error) {
      handleError(res, 500, 'Failed to determine CSV structure', error);
    }
});

router.put(
  '/tables/:tableName',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'feeds', 'tables'],
    Access.actions.create
  ),
  validateFeedTableNameMiddleware(),
  validateParametersMiddleware(createTableFeedParameters),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      const feedPath = TableFeed.pathForCompanyAndTable(company.identifier, req.params.tableName);
      const existingFeed = await TableFeed.getByPath(feedPath);
      if (existingFeed) { throw new DuplicateKeyError('TableFeed', feedPath); }

      let feed = new TableFeed({
        displayName: req.body.displayName,
        description: req.body.description,
        path: feedPath,
        tableName: req.params.tableName,
        mergeColumns: req.body.mergeColumns,
        columnMappings: req.body.columnMappings,
      });
      feed = await TableFeed.create(feed);
      try {
        tableCreationResult = await AlmacenAPI.createFeedTable(company.identifier, feed.tableName, req.body.columnTypes);
      } catch (error) {
        await TableFeed.deleteByPath(feed.path);
        throw error;
      }
      res.json({
        success: true,
        message: 'New table feed created.',
        feed: feed.sanitizedForUser(req.user),
      });
    } catch (error) {
        handleError(res, 500, 'Failed to create new table feed.', error);
    }
});

router.put(
  '/tables/:tableName/replace', 
  acl.middleware(), 
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'feeds', 'tables', req.params.tableName],
    Access.actions.edit
  ),
  validateFeedTableNameMiddleware(),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      let feed = await TableFeed.getByPath(TableFeed.pathForCompanyAndTable(company.identifier, req.params.tableName));
      if (!feed) { throw new NotFoundError('TableFeed', feedPath); }

      await AlmacenAPI.replaceFeedTableData(req, company.identifier, feed.tableName);

      feed.modificationTime = new Date();
      await feed.save();

      res.json({
        success: true,
        message: 'Feed table data replaced.',
        feed: feed.sanitizedForUser(req.user),
      });
    } catch (error) {
      handleError(res, 500, 'Failed to replace feed table data', error);
    }
});

router.patch(
  '/tables/:tableName/merge', 
  acl.middleware(), 
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'feeds', 'tables', req.params.tableName],
    Access.actions.edit
  ),
  validateFeedTableNameMiddleware(), 
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      let feed = await TableFeed.getByPath(TableFeed.pathForCompanyAndTable(company.identifier, req.params.tableName));
      if (!feed) { throw new NotFoundError('TableFeed', feedPath); }

      await AlmacenAPI.mergeFeedTableData(req, company.identifier, feed.tableName);

      feed.modificationTime = new Date();
      await feed.save();

      res.json({
        success: true,
        message: 'Feed table data merged.',
        feed: feed.sanitizedForUser(req.user),
      });
    } catch (error) {
      handleError(res, 500, 'Failed to merge feed table data', error);
    }
});

router.get(
  '/',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'feeds'],
    Access.actions.view
  ),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      let responseProps = {};

      let permissionError = Access.userPermissionError(req.user, Access.pathFromComponents(['companies', req.params.identifier, 'feeds', 'tables']), Access.actions.list);
      if (!permissionError) {
        let tableFeeds = await TableFeed.getAllByCompany(req.params.identifier);
        responseProps.tables = tableFeeds.map(feed => feed.sanitizedForUser(req.user));
      }

      permissionError = Access.userPermissionError(req.user, Access.pathFromComponents(['companies', req.params.identifier, 'feeds', 'core']), Access.actions.list);
      if (!permissionError) {
        let [coreConfig] = await AlmacenConfig.getAllByCompany(company.identifier);
        if (coreConfig) {
          responseProps.core = coreConfig.sanitizedForUser(req.user);
        }
      }

      res.json(Object.assign({
        success: true,
        message: 'Successfully retrieved company feeds.',
      }, responseProps));
    } catch (error) {
      handleError(res, 500, 'Failed to get tables', error);
    }
});

router.get(
  '/tables/:tableName/data', 
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'feeds', 'tables', req.params.tableName],
    Access.actions.view
  ),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      const feedPath = TableFeed.pathForCompanyAndTable(company.identifier, req.params.tableName);
      const feed = await TableFeed.getByPath(feedPath);
      if (!feed) { throw new NotFoundError('TableFeed', feedPath); }

      const query = `select * from ${company.identifier}.${feed.tableName}`;
      const result = await AlmacenAPI.postQueryForCompany(company.identifier, query, true);
      const signedURL = s3.getSignedUrl(result.body.s3_bucket, result.body.results_path);
      res.json({
        success: true,
        message: 'Successfully retrieved feed table data.',
        signedURL: signedURL,
      });
    } catch (error) {
      handleError(res, 500, 'Failed to get table data', error);
    }
});

router.delete(
  '/tables/:tableName',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'feeds', 'tables'],
    Access.actions.delete
  ),
  validateFeedTableNameMiddleware(),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      const feedPath = TableFeed.pathForCompanyAndTable(company.identifier, req.params.tableName);
      const feed = await TableFeed.getByPath(feedPath);
      if (!feed) { throw new NotFoundError('TableFeed', feedPath); }

      await AlmacenAPI.deleteFeedTable(req, company.identifier, req.params.tableName);
      await TableFeed.deleteByPath(feedPath);

      res.json({
        success: true,
        message: 'Feed table deleted.',
      });
    } catch (error) {
      handleError(res, 500, `Failed to delete table ${req.params.tableName}`, error);
    }
});

router.post(
  '/core/config',
  acl.middleware(),
  validateParametersMiddleware(createAlmacenConfigParameters),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'feeds', 'core'],
    Access.actions.edit
  ),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      // Ensure that the first key of the config matches the company identifier
      let configKeys = Object.keys(req.body.config);
      if (configKeys.length !== 1 || configKeys[0] !== company.identifier) {
        throw new BadRequestError(`Core config requires a top-level key equal to the company identifier (${company.identifier})`);
      }

      let [config] = await AlmacenConfig.getAllByCompany(company.identifier);
      if (config) {
        throw new DuplicateKeyError('AlmacenConfig');
      } else {
        const path = AlmacenConfig.pathForCompany(company.identifier);
        config = new AlmacenConfig({
          config: req.body.config,
          schedule: req.body.schedule || [],
          disabled: req.body.disabled || false,
          path: path,
        });
        config = await AlmacenConfig.create(config);
      }

      res.json({
        success: true,
        message: 'Successfully created core feeds configuration',
        config: config.sanitizedForUser(req.user),
      });
    } catch (error) {
      handleError(res, 500, 'Failed to create core feeds configuration', error);
    }
});

router.patch(
  '/core/config',
  acl.middleware(),
  validateParametersMiddleware(updateAlmacenConfigParameters),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'feeds', 'core'],
    Access.actions.edit
  ),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      // Ensure that the first key of the config matches the company identifier, if we got a config from the request
      if (req.body.config) {
        let configKeys = Object.keys(req.body.config);
        if (configKeys.length !== 1 || configKeys[0] !== company.identifier) {
          throw new BadRequestError(`Core config requires a top-level key equal to the company identifier (${company.identifier})`);
        }
      }
      
      let [config] = await AlmacenConfig.getAllByCompany(company.identifier);
      if (!config) {
        throw new BadRequestError(`A core config for ${company.identifier} doesn't exist yet`);
      }
      config.schedule = req.body.schedule || config.schedule;
      config.config = req.body.config || config.config;
      if (typeof req.body.disabled === 'boolean') {
        config.disabled = req.body.disabled;
      }
      config = await AlmacenConfig.update(config);

      res.json({
        success: true,
        message: 'Successfully updated core feeds configuration',
        config: config.sanitizedForUser(req.user),
      });
    } catch (error) {
      handleError(res, 500, 'Failed to update core feeds configuration', error);
    }
});

router.get(
  '/core/config',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'feeds', 'core'],
    Access.actions.list
  ),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      let [config] = await AlmacenConfig.getAllByCompany(company.identifier);
      if (!config) {
        throw new NotFoundError('CoreConfiguration', AlmacenConfig.pathForCompany(company.identifier));
      }

      res.json({
        success: true,
        message: 'Successfully retrieved core feeds configuration',
        config: config.sanitizedForUser(req.user),
      });
    } catch (error) {
      handleError(res, 500, 'Failed to retrieve core feeds configuration', error);
    }
});

module.exports = router;
