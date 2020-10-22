const express = require('express');
const router = express.Router({ mergeParams: true });
const acl = new(require('../modules/acl'))();
const Company = require('../models/company.model');
const Access = require('../modules/access');
const AlmacenAPI = require('../modules/almacen-api');
const {
  handleError,
  NotFoundError,
} = require('../modules/error');
const {
  Validating,
  validateParametersMiddleware,
 } = require('../modules/validating');
const TagsQuery = require('../queries/tags.query');
const TagsPerformanceQuery = require('../queries/tags-performance.query');
const s3 = require('../modules/s3');

acl.allow([{
  roles: [acl.roles.user],
  allows: [
    { resources: ['/:entity'], permissions: ['get'] },
    { resources: ['/:entity/primary'], permissions: ['patch'] },
    { resources: ['/:entity/subtag'], permissions: ['patch'] },
    { resources: ['/:entity/delete'], permissions: ['patch'] },
    { resources: ['/:entity/csv'], permissions: ['get'] },
    { resources: ['/:entity/csv/merge'], permissions: ['patch'] },
    { resources: ['/parsers'], permissions: ['get'] },
    { resources: ['/parsers/:parser'], permissions: ['put', 'delete'] },
    {
      resources: [
        '/standard',
        '/parsers/:parser/parse',
        '/parsers/:parser/tag',
      ],
      permissions: ['post']
    },
    { resources: ['/performance'], permissions: ['get'] },
  ],
}]);

/*-----------------------------------------------------------------------------
 * 
 * Endpoints for Tag Parser system
 * 
 *---------------------------------------------------------------------------*/

router.post(
  '/standard',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', 'parsers'],
    Access.actions.edit
  ),
  async (req, res, next) => {
    try {
      let upstreamResponse = await AlmacenAPI.forwardAndParseOriginalUrl({ req: req });
      res.json(upstreamResponse.body);
    } catch (error) {
      handleError(res, 500, 'Failed to run', error);
    }
  });

router.get(
  '/parsers',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', 'parsers'],
    Access.actions.list
  ),
  async (req, res, next) => {
    try {
      let upstreamResponse = await AlmacenAPI.forwardAndParseOriginalUrl({ req: req });
      res.json(upstreamResponse.body);
    } catch (error) {
      handleError(res, 500, 'Failed to retrieve tag parsers', error);
    }
  });

router.put(
  '/parsers/:parser',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', 'parsers'],
    Access.actions.edit
  ),
  async (req, res, next) => {
    try {
      let upstreamResponse = await AlmacenAPI.forwardAndParseOriginalUrl({ req: req });
      res.json(upstreamResponse.body);
    } catch (error) {
      handleError(res, 500, 'Failed to update tag parser', error);
    }
  });


router.delete(
  '/parsers/:parser',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', 'parsers'],
    Access.actions.delete
  ),
  async (req, res, next) => {
    try {
      let upstreamResponse = await AlmacenAPI.forwardAndParseOriginalUrl({ req: req });
      res.json(upstreamResponse.body);
    } catch (error) {
      handleError(res, 500, 'Failed to delete tag parser', error);
    }
  });

/**
 * @api {post} /parsers/:parser/parse Submit a list of names to a parser for extracting and returning tags
 * @apiGroup TagParsers
 * @apiName ParseNames
 * @apiParam {string} parser A parser identifier
 * @apiParam {Array} names The names to run through the parser
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 */
router.post(
  '/parsers/:parser/parse',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', 'parsers'],
    Access.actions.view
  ),
  async (req, res, next) => {
    try {
      let upstreamResponse = await AlmacenAPI.forwardAndParseOriginalUrl({ req: req });
      res.json(upstreamResponse.body);
    } catch (error) {
      handleError(res, 500, 'Failed to parse names', error);
    }
  });

/**
 * @api {post} /parsers/:parser/tag Submit a mapping of entity urls and names 
 *   to a parser for applying tags
 * @apiGroup TagParsers
 * @apiName TagEntities
 * @apiParam {string} parser A parser identifier
 * @apiParam {Record<string, string>} urls_to_names The mapping of entity URLs
 *   (e.g., channel_entity://apple_search_ads/campaign/123) to entity names to 
 * @apiParam {string} update_mode 'url'
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 */
router.post(
  '/parsers/:parser/tag',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', 'parsers'],
    Access.actions.view
  ),
  async (req, res, next) => {
    try {
      let upstreamResponse = await AlmacenAPI.forwardAndParseOriginalUrl({ req: req });
      res.json(upstreamResponse.body);
    } catch (error) {
      handleError(res, 500, 'Failed to parse names', error);
    }
  });

router.get(
  '/performance',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', 'parsers'],
    Access.actions.view
  ),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      const query = TagsPerformanceQuery.compose({
        schema: company.identifier, 
      });

      const result = await AlmacenAPI.postQueryForCompany(company.identifier, query, true);
      const signedURL = s3.getSignedUrl(result.body.s3_bucket, result.body.results_path);
      res.json({
        success: true,
        message: `Successfully retrieved performance data.`,
        signedURL: signedURL,
      });

    } catch (error) {
      handleError(res, 500, 'Failed to retrieve performance data', error);
    }
  });



/*-----------------------------------------------------------------------------
 * 
 * Endpoints for Tag/Subtag system
 * 
 *---------------------------------------------------------------------------*/


router.get(
  '/:entity',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', req.params.entity],
    Access.actions.list
  ),
  async (req, res, next) => {
    try {
      const entity = AlmacenAPI.entities[req.params.entity];
      if (entity === undefined) { throw new NotFoundError('Entity', req.params.entity); }
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      // let upstreamResponse = await AlmacenAPI.getTagsForCompanyEntity(req, company.identifier, entity);
      let upstreamResponse = await AlmacenAPI.getTagsForCompanyEntity(req, company.identifier, entity);
      res.json(upstreamResponse.body);

    } catch (error) {
      handleError(res, 500, 'Failed to retrieve company tags', error);
    }
});

router.patch(
  '/:entity/primary',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', req.params.entity],
    Access.actions.edit
  ),
  async (req, res, next) => {
    try {
      const entity = AlmacenAPI.entities[req.params.entity];
      if (entity === undefined) { throw new NotFoundError('Entity', req.params.entity); }

      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      await AlmacenAPI.updatePrimaryTagsForCompanyEntity(req, company.identifier, entity);

      // Run this asynchronously (i.e., do not wait for its completion to send our response)
      AlmacenAPI.applyTagsToCube(req, company.identifier, entity);

      res.json({
        success: true,
        message: 'Tags successfully updated',
      });
    } catch (error) {
      handleError(res, 500, 'Failed to update company tags', error);
    }
});

router.patch(
  '/:entity/subtag',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', req.params.entity],
    Access.actions.edit
  ),
  async (req, res, next) => {
    try {
      const entity = AlmacenAPI.entities[req.params.entity];
      if (entity === undefined) { throw new NotFoundError('Entity', req.params.entity); }

      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      await AlmacenAPI.updateSubtagsForCompanyEntity(req, company.identifier, entity);

      // Run this asynchronously (i.e., do not wait for its completion to send our response)
      AlmacenAPI.applyTagsToCube(req, company.identifier, entity);

      res.json({
        success: true,
        message: 'Subtags successfully updated',
      });
    } catch (error) {
      handleError(res, 500, 'Failed to update company subtags', error);
    }
});

router.patch(
  '/:entity/delete',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', req.params.entity],
    Access.actions.edit
  ),
  async (req, res, next) => {
    try {
      const entity = AlmacenAPI.entities[req.params.entity];
      if (entity === undefined) { throw new NotFoundError('Entity', req.params.entity); }

      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      await AlmacenAPI.deleteTagsForCompanyEntity(req, company.identifier, entity);

      // Run this asynchronously (i.e., do not wait for its completion to send our response)
      AlmacenAPI.applyTagsToCube(req, company.identifier, entity);

      res.json({
        success: true,
        message: 'Tags successfully deleted',
      });
  } catch(error) {
    handleError(res, 500, 'Failed to delete company tags', error);
  }
});

router.get(
  '/:entity/csv',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', req.params.entity],
    Access.actions.list
  ),
  async (req, res, next) => {
    try {
      const entity = AlmacenAPI.entities[req.params.entity];
      if (entity === undefined) { throw new NotFoundError('Entity', req.params.entity); }

      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      const query = TagsQuery.compose({
        schema: company.identifier, 
        tagEntity: entity,
      });

      const result = await AlmacenAPI.postQueryForCompany(company.identifier, query, true);
      const signedURL = s3.getSignedUrl(result.body.s3_bucket, result.body.results_path);
      res.json({
        success: true,
        message: `Successfully exported ${entity} tag data to csv.`,
        signedURL: signedURL,
      });

    } catch (error) {
      handleError(res, 500, 'Failed to export tag data', error);
    }
});

router.patch(
  '/:entity/csv/merge',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', req.params.entity],
    Access.actions.edit
  ),
  async (req, res, next) => {
    try {
      const entity = AlmacenAPI.entities[req.params.entity];
      if (entity === undefined) { throw new NotFoundError('Entity', req.params.entity); }

      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      await AlmacenAPI.mergeCSVTags(req, company.identifier, entity)

      // Run this asynchronously (i.e., do not wait for its completion to send our response)
      AlmacenAPI.applyTagsToCube(req, company.identifier, entity);

      res.json({
        success: true,
        message: 'Tags successfully merged',
      });
    } catch (error) {
      handleError(res, 500, 'Failed to retrieve company tags', error);
    }
});

module.exports = router;
