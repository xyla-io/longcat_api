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
const Navbar = require('../models/navbar.model');
const NavbarValidation = require('./validation/navbars.validation');
const Access = require('../modules/access');
const setops = require('../modules/setops');

acl.allow([{
  roles: [acl.roles.user],
  allows: [
    { resources: ['/companies/:companyIdentifier/reports'], permissions: ['get'] },
  ]
}, {
  roles: [acl.userRoles.super],
  allows: [
    { resources: ['/companies/:companyIdentifier/reports'], permissions: ['put'] },
    { resources: ['/companies/:companyIdentifier/reports'], permissions: ['delete'] },
  ]
}]);

function getAllChildNodeIdentifiers(nodes) {
  return nodes.reduce((refs, node) => {
    return refs.concat(node.targets.filter(target => target.type === 'node'));
  }, []);
}

function findEmptyNodeIndices(nodes) {
  return nodes.reduce((emptyNodeIndices, node, i) => {
    if (!node.targets.length) { emptyNodeIndices.push(i); }
    return emptyNodeIndices;
  }, []);
}

function findRootNode(nodes) {
  let childNodeIdentifiers = getAllChildNodeIdentifiers(nodes);
  return nodes.find(node => !childNodeIdentifiers.includes(node.identifier));
}

function findRootNodeIndex(nodes) {
  let childNodeIdentifiers = getAllChildNodeIdentifiers(nodes);
  return nodes.findIndex(node => !childNodeIdentifiers.includes(node.identifier));
}

function assembleNodeTargetReport(reportPath) {
  return {
    type: 'report',
    identifier: reportPath,
  };
}

/**
 * @api {get} /navbars/companies/:identifier/reports Retrieve the reports navbar for a company
 * @apiName GetCompanyReportsNavbar
 * @apiGroup Navbars
 * @apiParam {String} companyIdentifier Unique company ID
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Array} nodes The navbar node structure
 */
router.get('/companies/:companyIdentifier/reports', acl.middleware(), async (req, res, next) => {
  const accessPath = Access.pathFromComponents(['companies', req.params.companyIdentifier, 'reports']);
  const permissionError = Access.userPermissionError(req.user, accessPath, Access.actions.list);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }
  try {
    const company = await Company.getByIdentifier(req.params.companyIdentifier)
    if (!company) { return new NotFoundError('company', req.params.companyIdentifier).send(res, 404); }

    const navbar = await Navbar.getByCompany(company, 'reports');
    const companyReports = (await Report.getAllByCompany(company.identifier)).filter(r => (r.reportVersion || 1) < 2);
    if (navbar === null) {
      // Send a virtual navbar that includes all the reports at the top-level
      return res.json({
        success: true,
        message: 'Reports navbar retrieved.',
        navbar: {
          nodes: [{
            targets: companyReports.map(report => assembleNodeTargetReport(report.path)),
            identifier: 'root',
          }],
        }
      });
    } else {
      // Send the retrieved navbar, modified to be synced with actual reports, i.e.:
      //  - remove non-existing reports that are included in the navbar (phantom reports)
      //  - append existing reports that aren't included in the navbar to the top-level at the end (missing reports)
      //  - remove nodes that are empty
      let navbarReportPaths = new Set(navbar.nodes.reduce((navbarReports, node) => {
        return navbarReports.concat(node.targets.filter(target => target.type === 'report').map(target => target.identifier));
      }, []));
      let companyReportPaths = new Set(companyReports.map(report => report.path));
      let navbarPhantomReportPaths = Array.from(setops.difference(navbarReportPaths, companyReportPaths));
      let navbarMissingReportPaths = Array.from(setops.difference(companyReportPaths, navbarReportPaths));

      // Remove the phantom report targets
      navbar.nodes = navbar.nodes.map(node => {
        node.targets = node.targets.filter(target => {
          return !navbarPhantomReportPaths.includes(target.identifier);
        });
        return node;
      });

      // Append reports that are missing from the navbar to the root node
      if (navbarMissingReportPaths.length) {
        let rootNodeIndex = findRootNodeIndex(navbar.nodes);
        navbar.nodes[rootNodeIndex].targets.push(...navbarMissingReportPaths.map(path => assembleNodeTargetReport(path)));
      }

      // Remove nodes that are empty 
      let emptyNodeIndices = findEmptyNodeIndices(navbar.nodes);
      while (emptyNodeIndices.length) {
        emptyNodeIndices.forEach(index => {
          let nodeIdentifier = navbar.nodes[index].identifier;
          navbar.nodes.splice(index, 1);
          navbar.nodes = navbar.nodes.map(node => {
            node.targets = node.targets.filter(target => {
              return target.identifier !== nodeIdentifier;
            });
            return node;
          });
        });
        emptyNodeIndices = findEmptyNodeIndices(navbar.nodes);
      }

      return res.json({
        success: true,
        message: 'Reports navbar retrieved.',
        navbar: navbar.sanitizedForUser(req.user),
      });
    }
  } catch(error) {
    return handleError(res, 500, 'Failed to retrieve reports navbar', error);
  }
});

/**
 * @api {put} /navbars/companies/:identifier/reports Update the reports navbar for a company
 * @apiName UpdateCompanyReportsNavbar
 * @apiGroup Navbars
 * @apiParam {String} companyIdentifier Unique company ID
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 * @apiSuccess {Array} nodes The navbar node structure
 */
router.put('/companies/:companyIdentifier/reports', acl.middleware(), async (req, res, next) => {
  const parameters = NavbarValidation.Creation(req.body);
  const errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }

  try {
    const company = await Company.getByIdentifier(req.params.companyIdentifier)
    if (!company) { return new NotFoundError('company', req.params.companyIdentifier).send(res, 404); }

    const companyReports = await Report.getAllByCompany(company.identifier);
    const companyReportPaths = companyReports.map(report => report.path);

    // Ensure all referenced reports exist
    for (let nodeIndex = 0; nodeIndex < parameters.nodes.length; nodeIndex++) {
      let node = parameters.nodes[nodeIndex];
      for (let targetIndex = 0; targetIndex < node.targets.length; targetIndex++) {
        let target = node.targets[targetIndex];
        if (target.type === 'report' && !companyReportPaths.includes(target.identifier)) {
          return handleError(res, 400, `Navbar node (${node.identifier}) references report path (${target.identifier}) that doesn't exist`);
        }
      }
    }

    let navbar = await Navbar.getByCompany(company, 'reports');
    if (navbar !== null) {
      navbar.nodes = parameters.nodes;
      await Navbar.update(navbar);
    } else {
      navbar = await Navbar.fromParameters(company, 'reports', parameters);
      await Navbar.create(navbar)
    }
    res.json({
      success: true,
      message: 'Reports navbar updated.',
      navbar: navbar.sanitizedForUser(req.user),
    });
  } catch(error) {
    return handleError(res, 500, 'Failed to update reports navbar', error);
  }
});

/**
 * @api {delete} /navbars/companies/:identifier/reports Remove the custom reports navbar for a company
 * @apiName DeleteCompanyReportsNavbar
 * @apiGroup Navbars
 * @apiParam {String} companyIdentifier Unique company ID
 * @apiSuccess {Boolean} success `true` if the request was successful
 * @apiSuccess {String} message A message describing the result of the request
 */
router.delete('/companies/:companyIdentifier/reports', acl.middleware(), async (req, res, next) => {
  try {
    const company = await Company.getByIdentifier(req.params.companyIdentifier)
    if (!company) { return new NotFoundError('company', req.params.companyIdentifier).send(res, 404); }

    await Navbar.deleteByCompany(company, 'reports');
    res.json({
      success: true,
      message: 'Navbar deleted.',
    });
  } catch (error) {
    if (error instanceof NotFoundError) { return error.send(res, 404); }
    return handleError(res, 500, 'Failed to delete navbar', error);
  }
});

module.exports = router;
