const express = require('express');
const router = express.Router();
const acl = new(require('../modules/acl'))();
const {
  handleError,
  handleValidationErrors,
  NotFoundError,
  DuplicateKeyError,
} = require('../modules/error');
const Company = require('../models/company.model');
const Report = require('../models/report.model');
const Access = require('../modules/access');
const ReportValidation = require('./validation/reports.validation');

acl.allow([{
  roles: [acl.roles.user],
  allows: [
    { resources: ['/companies/:identifier'], permissions: ['get'] },
  ]
}, {
  roles: [acl.userRoles.super],
  allows: [
    { resources: ['/companies/:companyIdentifier/create/:identifier'], permissions: ['post'] },
    { resources: ['/:path'], permissions: ['delete'] },
    { resources: ['/:path'], permissions: ['put'] },
  ]
}]);

/**
 * @api {get} /reports/companies/:identifier Retrieve all company reports
 * @apiName GetCompanyReports
 * @apiGroup Reports
 * @apiParam {String} identifier Unique company ID
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Array} reports The list of reports for the company
 */
router.get('/companies/:identifier', acl.middleware(), async (req, res) => {
  let permissionError = Access.userPermissionError(req.user, Access.pathFromComponents(['companies', req.params.identifier, 'reports']), Access.actions.list);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }
  try {
    const company = await Company.getByIdentifier(req.params.identifier);
    if (!company) { return handleError(res, 404, 'Company not found'); }

    const companyReports = await Report.getAllByCompany(company.identifier);

    res.json({
      success: true,
      message: 'Company reports retrieved.',
      reports: companyReports.map(report => report.sanitizedForUser(req.user)),
    });
  } catch(error) {
    return handleError(res, 500, 'Failed to retrieve company reports', error);
  }
});

/**
 * @api {post} /reports/:company/create Create a report
 * @apiName CreateReport
 * @apiGroup Reports
 * @apiParam {String} displayName The human-readable name of the report for display purposes
 * @apiParam {String} identifier The human-readable name of the report for identification purposes
 * @apiParam {String} companyIdentifer The identifier of the company that owns the report
 * @apiParam {String} content The content of the report
 * @apiSuccess {Boolean} success `true` if report creation was successful
 * @apiSuccess {Boolean} message A message describing the result of the request
 * @apiSuccess {Object} report Properties of the report at creation time
 */
router.post('/companies/:companyIdentifier/create/:identifier', acl.middleware(), async (req, res, next) => {
  let parameters = ReportValidation.Creation(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }
  let path = Access.pathFromComponents(['companies', req.params.companyIdentifier, 'reports', req.params.identifier]);
  let permissionError = Access.userPermissionError(req.user, path, Access.actions.create);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }

  try {
    const report = await Report.fromPathAndParameters(path, parameters);
    const createdReport = await Report.create(report);
    res.status(201).json({
      success: true,
      message: 'Created report.',
      report: createdReport.sanitizedForUser(req.user),
    });
  } catch (error) {
    if (error instanceof DuplicateKeyError) {
      return error.send(res, 400, { key: 'path', value: path });
    }
    if (error instanceof NotFoundError) {
      return error.send(res, 404);
    }
    return handleError(res, 500, 'Failed to create report', error);
  }
});

/**
 * @api {delete} /reports/:path Delete a report
 * @apiName DeleteReport
 * @apiGroup Reports
 * @apiParam {String} path The path of the report to delete
 * @apiSuccess {Boolean} success `true` if report deletion was successful
 * @apiSuccess {String} message A message describing the result of the request
 */
router.delete('/:path', acl.middleware(), async (req, res, next) => {
  let permissionError = Access.userPermissionError(req.user, req.params.path, Access.actions.delete);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }

  try {
    await Report.deleteByPath(req.params.path);
    res.json({
      success: true,
      message: 'Report deleted.',
    });
  } catch (error) {
    if (error instanceof NotFoundError) { return error.send(res, 404, {key: 'path', value: req.params.path}); }
    return handleError(res, 500, 'Failed to delete report', error);
  }
});

/**
 * @api {put} /reports/:path
 * @apiName UpdateReport
 * @apiGroup Reports
 * @apiParam {String} path The path of the report to update
 * @apiParam {String} [displayName] The display name to update
 * @apiParam {String} [identifier] The identifier to update
 * @apiSuccess {Boolean} success `true` if report update was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Object} report The up-to-date report information
 */
router.put('/:path', acl.middleware(), async (req, res) => {
  let parameters = ReportValidation.Creation(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }
  let permissionError = Access.userPermissionError(req.user, req.params.path, Access.actions.edit);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }

  try {
    const existingReport = await Report.getByPath(req.params.path);
    if (!existingReport) { return new NotFoundError('path', req.params.path).send(res, 404); }
    let report = await Report.fromPathAndParameters(req.params.path, parameters);
    existingReport.displayName = report.displayName;
    existingReport.reportVersion = report.reportVersion;
    existingReport.content = report.content;
    await Report.update(existingReport);
    res.json({
      success: true,
      message: 'Updated report.',
      report: existingReport.sanitizedForUser(req.user),
    });
  } catch (error) {
    if (error instanceof DuplicateKeyError) {
      return error.send(res, 400, { key: 'path', value: req.params.path });
    }
    if (error instanceof NotFoundError) {
      return error.send(res, 404);
    }
    return handleError(res, 500, 'Failed to update report', error);
  }
});

module.exports = router;
