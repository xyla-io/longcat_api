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
const EntitiesQuery = require('../queries/entities.query');
const s3 = require('../modules/s3');

acl.allow([{
  roles: [acl.roles.user],
  allows: [
    { resources: ['/'], permissions: ['get'] },
  ],
}]);

router.get(
  '/',
  acl.middleware(),
  Access.userPermissionMiddleware(
    req => ['companies', req.params.identifier, 'tags', 'parsers'],
    Access.actions.list
  ),
  async (req, res, next) => {
    try {
      const company = await Company.getByIdentifier(req.params.identifier);
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }

      const query = EntitiesQuery.compose({
        schema: company.identifier, 
      });

      const result = await AlmacenAPI.postQueryForCompany(company.identifier, query, true);
      const signedURL = s3.getSignedUrl(result.body.s3_bucket, result.body.results_path);
      res.json({
        success: true,
        message: `Successfully retrieved entities.`,
        signedURL: signedURL,
      });

    } catch (error) {
      handleError(res, 500, 'Failed to retrieve entities', error);
    }
  });


module.exports = router;
