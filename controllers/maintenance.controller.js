const express = require('express');
const router = express.Router();
const acl = new(require('../modules/acl'))();
const { cloneDeep } = require('lodash');
const {
  Validating,
  validateParametersMiddleware,
} = require('../modules/validating');
const {
  handleError,
  NotFoundError,
} = require('../modules/error');
const handleValidationErrors = require('../modules/error').handleValidationErrors;
const Access = require('../modules/access');
const User = require('../models/user.model');
const Company = require('../models/company.model');
const Permission = require('../models/permission.model').Permission;
const PermissionGroup = require('../models/permission.model').PermissionGroup;
const AlmacenConfig = require('../models/almacen-config.model').AlmacenConfig;
const Q = require('q');
const micraStore = new(require('../modules/micra/micra-store').MicraStore)();
const { MicraRequests } = require('../modules/micra/micra-requests');
const { MicraJobs } = require('../modules/micra/micra-jobs');
const { MicraCommand } = require('../modules/micra/micra-command');
const micraRequests = new MicraRequests();
const micraJobs = new MicraJobs();
const Report = require('../models/report.model');
const Template = require('../models/template.model');
const productNameVariableRowFilter = require('../models/templates/product-name.variable-row-filter.template');

let ConvertEmailToLowerCaseParameters = Validating.model({
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
    },
    skipDuplicateAccounts: {
      type: 'boolean',
    },
  },
  required: ['dryRun', 'skipDuplicateAccounts'],
  additionalProperties: false,
});

let CreateCompanyPermissionsParameters = Validating.model({
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
    },
    companies: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1
      },
      minItems: 1,
      uniqueItems: true,
    },
  },
  required: ['dryRun'],
  additionalProperties: false,
});

let CleanUnusedPermissionsParameters = Validating.model({
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
    },
  },
  required: ['dryRun'],
  additionalProperties: false,
});

let AddAllCompanyUsersToAnalystsParameters = Validating.model({
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
    },
    company: {
      type: 'string',
      minLength: 1
    },
  },
  required: ['dryRun', 'company'],
  additionalProperties: false,
});

let CreateGlobalPermissionsParameters = Validating.model({
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
    },
  },
  required: ['dryRun'],
  additionalProperties: false,
});

let AddDataAnalystToCompanyParameters = Validating.model({
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
    },
    company: {
      type: 'string',
      minLength: 1
    },
    email: {
      type: 'string',
      minLength: 1
    },
  },
  required: ['dryRun', 'company', 'email'],
  additionalProperties: false,
});

let UpdateCompanyStorageScaffoldingParameters = Validating.model({
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
    },
    companies: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1
      },
      minItems: 1,
      uniqueItems: true,
    },
  },
  required: ['dryRun', 'companies'],
  additionalProperties: false,
});

let TriggerAlmacenParameters = Validating.model({
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean'
    },
    companies: {
      type: 'array',
      items: {
        type: 'sring',
        minLength: 1,
      },
      minItems: 1,
      uniqueItems: true,
    }
  },
  required: ['dryRun', 'companies'],
  additionalProperties: false,
});

let CreateDefaultXylaReportParameters = Validating.model({
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean'
    },
    companyIdentifier: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['dryRun', 'companyIdentifier'],
  additionalProperties: false,
});

let UpdateAllTemplateVersionsParameters = Validating.model({
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean'
    },
  },
  required: ['dryRun'],
  additionalProperties: false,
});


acl.allow([{
  roles: [acl.userRoles.super],
  allows: [
    // { resources: ['/convert-email-to-lower-case'], permissions: ['patch'] },
    { resources: ['/create-company-permissions'], permissions: ['post'] },
    { resources: ['/clean-unused-permissions'], permissions: ['delete'] },
    { resources: ['/add-all-company-users-to-analysts'], permissions: ['patch'] },
    { resources: ['/create-global-permissions'], permissions: ['post'] },
    { resources: ['/add-data-analyst-to-company'], permissions: ['patch'] },
    { resources: ['/update-company-storage-scaffolding'], permissions: ['patch'] },
    { resources: ['/micra-jobs'], permissions: ['get'] },
    { resources: ['/micra-jobs/:name'], permissions: ['get'] },
    { resources: ['/micra-health'], permissions: ['get'] },
    { resources: ['/trigger-almacen'], permissions: ['post'] },
    { resources: ['/activity'], permissions: ['get'] },
    { resources: ['/create-default-xyla-report'], permissions: ['post'] },
    { resources: ['/update-all-template-versions'], permissions: ['post'] },
  ],
}, ]);

router.patch('/convert-email-to-lower-case', acl.middleware(), (req, res, next) => {
  let parameters = new ConvertEmailToLowerCaseParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }
  User.getAll()
    .then(users => {
      let usersByEmail = {};
      users.forEach(user => {
        let lowerCaseEmail = user.local.email.toLowerCase();
        if (usersByEmail[lowerCaseEmail] !== undefined) {
          usersByEmail[lowerCaseEmail].push(user);
        } else {
          usersByEmail[lowerCaseEmail] = [user];
        }
      });
      let duplicateAccounts = {};
      let usersToConvert = [];
      for (key in usersByEmail) {
        if (usersByEmail[key].length > 1) {
          duplicateAccounts[key] = usersByEmail[key].map(user => user.sanitizedForUser(req.user));
          delete usersByEmail[key];
        } else if (usersByEmail[key][0].local.email.toLowerCase() === usersByEmail[key][0].local.email) {
          delete usersByEmail[key];
        } else {
          usersToConvert = usersToConvert.concat(usersByEmail[key]);
        }
      }
      if (!parameters.skipDuplicateAccounts && Object.keys(duplicateAccounts).length) {
        res.json({
          dryRun: parameters.dryRun,
          success: false,
          message: `Duplicate accounts found for ${Object.keys(duplicateAccounts).length} email addresses.`,
          duplicateAccounts: duplicateAccounts,
        });
        return;
      }
      if (!usersToConvert.length) {
        res.json({
          dryRun: parameters.dryRun,
          success: false,
          message: 'No email addresses found to convert.'
        });
        return;
      }
      return Q.all(usersToConvert.map(user => {
        user.local.email = user.local.email.toLowerCase();
        if (parameters.dryRun) { return user; }
        return user.save();
      }));
    })
    .then(users => {
      res.json({
        dryRun: parameters.dryRun,
        success: users.length > 0,
        message: `Converted ${users.length} email addresses to lower case.`,
        convertedUsers: users.map(user => user.sanitizedForUser(req.user)),
      });      
    })
    .catch(error => {
      handleError(res, 500, 'Failed to convert email addresses to lowercase', error);
    });
});

router.post('/create-company-permissions', acl.middleware(), (req, res, next) => {
  let parameters = new CreateCompanyPermissionsParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }
  let companiesPromise;
  if (parameters.companies !== undefined) {
    companiesPromise = Q.all(parameters.companies.map(companyIdentifier => Company.getByIdentifier(companyIdentifier)));  
  } else {
    companiesPromise = Company.getAll();
  }
  if (parameters.dryRun) {
    companiesPromise.then(companies => {
      res.json({
        dryRun: parameters.dryRun,
        success: true,
        message: 'Would create permissions for companies.',
        companies: companies.map(company => company.sanitizedForUser(req.user)),
      });
    });
    return;
  }
  companiesPromise.then(companies => {
      return Q.all(companies.map(company => {
        return Company.createPermissions(company.displayName, company.identifier)
          .then(permissions => Company.createPermissionGroups(company.displayName, company.identifier, permissions));
      }));
    })
    .then(company_groups => {
      let groups = [].concat.apply([], company_groups);
      res.json({
        success: true,
        message: `Created ${groups.length} permission groups for ${company_groups.length} companies.`,
        groups: groups,
      });      
    })
    .catch(error => {
      handleError(res, 500, 'Failed to create company permissions', error);
    });
});

router.delete('/clean-unused-permissions', acl.middleware(), (req, res, next) => {
  let parameters = new CleanUnusedPermissionsParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }
  Permission.find()
    .then(permissions => {
      if (!permissions.length) {
        res.json({
          dryRun: parameters.dryRun,
          success: false,
          message: `No permissions found.`,
        });
        return;
      }
      Q.all(permissions.map(permission => PermissionGroup.find({grants: permission._id}).then(groups => (groups.length) ? null : ((parameters.dryRun) ? permission : permission.remove().then(() => permission)))))
        .then(results => {
          let removedPermissions = results.filter(permission => permission);
          res.json({
            dryRun: parameters.dryRun,
            success: removedPermissions.length > 0,
            message: `${removedPermissions.length} unused permissions removed.`,
            permissions: removedPermissions.map(permission => permission.sanitizedForUser(req.user)),
          });
        })
        .catch(error => {
          handleError(res, 500, 'Failed to create company permissions', error);
        });
    });
});

router.patch('/add-all-company-users-to-analysts', acl.middleware(), (req, res, next) => {
  let parameters = new AddAllCompanyUsersToAnalystsParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }
  let groupPath = `companies_${Access.escapedPathComponent(parameters.company)}_groups_analyst`;
  PermissionGroup.getByPath(groupPath)
    .then(group => {
      if (!group) { throw new Error(`Group not found for path: ${groupPath}`); }
      return Company.getByIdentifier(parameters.company)
        .then(company => {
          if (!company) { throw new Error(`Company not found for identifier: ${parameters.company}`); }
          return User.getAllByCompanyID(company._id)
        })
        .then(users => {
          let usersToAdd = users.filter(user => user.groups.map(userGroup => userGroup.path).indexOf(group.path) === -1);
          if (!usersToAdd.length) { return []; }
          return Q.all(usersToAdd.map(user => {
            user.groups.push(group);
            if (parameters.dryRun) { return user; }
            return user.save();
          }));
        });
    })
    .then(users => {
      res.json({
        dryRun: parameters.dryRun,
        success: users.length > 0,
        message: `Added ${users.length} users to the ${groupPath} group.`,
        users: users.map(user => user.sanitizedForUser(req.user)),
      });      
    })
    .catch(error => {
      handleError(res, 500, 'Failed to add company users to the analysts group', error);
    });
});

router.post('/create-global-permissions', acl.middleware(), (req, res, next) => {
  let parameters = new CreateGlobalPermissionsParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }

  let permissions = [
    {
      path: 'permissions_companies_select',
      displayName: 'Select Company',
      shortDisplayName: 'Select Company',
      targetPathPattern: '^companies$',
      actionPattern: '^select$',
    },
    {
      path: 'permissions_groups_analyst_view',
      displayName: 'View Global Analysts Group',
      shortDisplayName: 'View Global Analysts Group',
      targetPathPattern: '^groups_analyst$',
      actionPattern: '^view$',
    },
  ];

  let groups = [
    {
      path: 'groups_analyst',
      displayName: 'Global Analysts',
      shortDisplayName: 'Global Analysts',
      grants: [
        'permissions_companies_select',
        'permissions_groups_analyst_view',
      ],
    },
  ];

  if (parameters.dryRun) {
    res.json({
      dryRun: true,
      message: `Created ${permissions.length} global permissions`,
      groups: groups,
    });
    return;
  }

  Q.all(permissions.map(permission => Permission.collection.replaceOne({path: permission.path}, permission, {upsert: true})))
    .then(() => Permission.find({path: {$in: permissions.map(permission => permission.path)}}))
    .then(permissions => {
      function permissionIDsWithPaths(paths) {
        let permissionObjects = permissions.filter(permission => paths.indexOf(permission.path) !== -1);
        if (permissionObjects.length !== paths.length) { throw 'Permission paths do not match expected paths for group' }
        return permissionObjects.map(permission => permission._id);
      }
    
      return Q.all(groups.map(group => { 
        group.grants = permissionIDsWithPaths(group.grants);
        return PermissionGroup.collection.replaceOne({path: group.path}, group, {upsert: true});
      }));
    })
    .then(() => PermissionGroup.find({path: {$in: groups.map(group => group.path)}}).populate('grants'))
    .then(groups => {
      res.json({
        success: true,
        message: `Created ${groups.length} permission global groups.`,
        groups: groups,
      });      
    })
    .catch(error => {
      handleError(res, 500, 'Failed to create global permissions', error);
    });
});

router.patch('/add-data-analyst-to-company', acl.middleware(), (req, res, next) => {
  let parameters = new AddDataAnalystToCompanyParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }
  let groupPath = `companies_${Access.escapedPathComponent(parameters.company)}_groups_analyst`;
  PermissionGroup.getByPath(groupPath)
    .then(group => {
      if (!group) { throw new Error(`Group not found for path: ${groupPath}`); }
      return Company.getByIdentifier(parameters.company)
        .then(company => {
          if (!company) { throw new Error(`Company not found for identifier: ${parameters.company}`); }
          return User.getByEmail(parameters.email)
            .then(user => {
              let userIsCompanyMember = user.companies.filter(userCompany => userCompany.identifier === company.identifier).length > 0;
              let userIsGroupMember = user.groups.filter(userGroup => userGroup.path === group.path).length > 0;
              if (userIsCompanyMember && userIsGroupMember) { 
                res.json({
                  dryRun: parameters.dryRun,
                  success: false,
                  message: 'User was already a company data analyst.',
                  user: user.sanitizedForUser(req.user),
                });
                return;
              }
              if (!userIsCompanyMember) {
                user.companies.push(company);
              }
              if (!userIsGroupMember) {
                user.groups.push(group);
              }
              if (parameters.dryRun) {
                res.json({
                  dryRun: parameters.dryRun,
                  success: true,
                  message: 'User added as company data analyst.',
                  user: user.sanitizedForUser(req.user),
                });
                return;
              } 
              return user.save()
                .then(user => {
                  res.json({
                    dryRun: parameters.dryRun,
                    success: true,
                    message: 'User added as company data analyst.',
                    user: user.sanitizedForUser(req.user),
                  });
                });
            });
        });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to add user as company data analyst', error);
    });
});

router.patch('/update-company-storage-scaffolding', acl.middleware(), (req, res, next) => {
  let parameters = new UpdateCompanyStorageScaffoldingParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }
  let promisedCompanies = [];
  let allCompanyPaths = [];
  let successObject = {
    dryRun: parameters.dryRun,
    success: true,
    message: 'Storage scaffolding updated for given companies.',
    companies: parameters.companies,
    directories: [],
  };
  parameters.companies.forEach(companyIdentifier => {
    promisedCompanies.push(Company.getByIdentifier(companyIdentifier));
  });
  Q.all(promisedCompanies)
    .then(companies => {
      const invalidIndex = companies.indexOf(null);
      if (invalidIndex > -1) {
        return handleError(res, 404, `Company not found: ${parameters.companies[invalidIndex]}`);
      }
      let promisedCompanyScaffoldings = [];
      companies.forEach(company => {
        allCompanyPaths.push(company.storageDirectories);
        if (!parameters.dryRun) {
          promisedCompanyScaffoldings.push(company.buildStorageScaffolding());
        }
      });
      successObject.directories = allCompanyPaths;
      if (parameters.dryRun) { return Q.resolve(); }
      else { return Q.all(promisedCompanyScaffoldings); }
    })
    .then(() => { return res.json(successObject); })
    .catch(err => { return handleError(res, 500, err); });
});

router.get('/micra-health', acl.middleware(), async (req, res, next) => {
  try {
    let health = await micraStore.r.hgetallAsync('micra_health');
    if (!health) {
      throw new NotFoundError('micra_health');
    }
    Object.keys(health).forEach(service => {
      health[service] = JSON.parse(health[service]);
    });
    res.json({
      success: true,
      message: 'Retrieved health.',
      health,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to access Micra Health stats.', error);
  }
});

router.get('/micra-jobs', acl.middleware(), async (req, res, next) => {
  let almacen_ready_jobs = await micraJobs.getAlmacenReadyJobs();
  let active_jobs = await micraJobs.getActiveJobs();
  let ready_jobs = await micraJobs.getReadyJobs();
  let longcat_api_requests = await micraJobs.getLongcatAPIRequests();
  let longcat_api_requests_to_score = await micraJobs.getLongcatAPIRequestsToScore();
  let longcat_api_scoring_hopper = await micraJobs.getLongcatAPIScoringHopper();

  res.json({
    success: true,
    message: 'Retrieved jobs.',
    active_jobs,
    ready_jobs,
    almacen_ready_jobs,
    longcat_api_requests,
    longcat_api_requests_to_score,
    longcat_api_scoring_hopper,
  });
});

router.get('/micra-jobs/:name', acl.middleware(), async (req, res, next) => {
  try {
    let job = await micraJobs.getJob(req.params.name);
    if (!job) {
      throw new NotFoundError(req.params.name);
    }
    job.configuration = JSON.parse(job.configuration);
    res.json({
      success: true,
      message: 'Retrieved job.',
      job,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to find job.', error);
  }
});

router.post(
  '/trigger-almacen',
  acl.middleware(),
  validateParametersMiddleware(TriggerAlmacenParameters),
  async (req, res, next) => {
    try {
      const companies = req.body.companies;
      const coreConfigs = await Promise.all(companies.map(async (identifier) => {
        let [config] = await AlmacenConfig.getAllByCompany(identifier);
        if (!config) {
          throw new NotFoundError('CoreConfiguration', AlmacenConfig.pathForCompany(identifier));
        }
        return config.config;
      }));

      if (!req.body.dryRun) {
        coreConfigs.forEach(config => {
          micraRequests.dispatch({
            company: Object.keys(config)[0],
            action: MicraRequests.actions.almacen_schedule,
            body: config,
          });
        });
      }

      res.json({
        dryRun: req.body.dryRun,
        success: true,
        message: `Triggered Almacen core data fetch${coreConfigs.length > 1 ? 'es' : ''}.`,
        configs: coreConfigs,
      });

    } catch(error) {
      handleError(res, 500, 'Failed to trigger Almacen core data fetch(es).', error);
    }
});

router.get(
  '/activity',
  acl.middleware(),
  async (req, res, next) => {
    try {
      let command = new MicraCommand.View({ tag: 'job' });
      let activity = await command.run();
      res.json({
        success: true,
        message: 'Successfully retrieved activity.',
        activity, 
      });
    } catch (error) {
      handleError(res, 500, 'Failed to retrieve activity information.', error);
    }
});

router.post(
  '/create-default-xyla-report',
  acl.middleware(),
  validateParametersMiddleware(CreateDefaultXylaReportParameters),
  async (req, res, next) => {
    try {
      if (req.body.dryRun) {
        return res.json({
          dryRun: req.body.dryRun,
          success: true,
          message: `Would try to create default xyla report for ${req.body.companyIdentifier}.`,
        });
      }
      const createdReport = await Report.createDefaultXylaReport(req.body.companyIdentifier);
      if (createdReport) {
        return res.json({
          dryRun: req.body.dryRun,
          success: true,
          message: `Successfully created default xyla report for ${req.body.companyIdentifier}.`,
          report: createdReport.sanitizedForUser(req.user),
        });
      }
      return res.json({
        dryRun: req.body.dryRun,
        success: false,
        message: `Default xyla report already exists for ${req.body.companyIdentifier}.`,
      });
    } catch (error) {
      handleError(res, 500, `Failed to create default xyla report for ${req.body.companyIdentifier}.`, error);
    }
});

router.post(
  '/update-all-template-versions',
  validateParametersMiddleware(UpdateAllTemplateVersionsParameters),
  acl.middleware(),
  async (req, res, next) => {
    try {
      let updatedTemplateCount = 0;

      const templateUpdatesByType = {
        breakdown_table: {
          updater: (template) => {
            if (!template.structure.options) {
              template.structure.options = {};
              template.markModified('structure');
            }
            return template;
          },
        },
        master: {
          updater: (template) => {
            if (!template.structure.options) {
              template.structure.options = {};
              template.markModified('structure');
            }
            if (!template.structure.options.variableRowFilters) {
              template.structure.options.variableRowFilters = [];
              template.markModified('structure');
            }
            const productNameFilter = productNameVariableRowFilter();
            if (!template.structure.options.variableRowFilters.find(filter => filter.metadata.identifier === productNameFilter.metadata.identifier)) {
              template.structure.options.variableRowFilters.push(productNameFilter);
              template.markModified('structure');
            }
            return template;
          },
        }
      };

      for (const [templateType, updateRecord] of Object.entries(templateUpdatesByType)) {
        let templates = await Template
          .search({ templateTypes: [templateType] })
          .then(templatePaths => Template.getByPaths(templatePaths));

        updateRecord.before = cloneDeep(templates).map(t => t.sanitizedForUser(req.user));
        templates = templates.map(updateRecord.updater);
        updateRecord.after = templates.map(t => t.sanitizedForUser(req.user));
        updateRecord.count = templates.length;
        if (req.body.dryRun === false) {
          for (const template of templates) {
            await template.save();
          }
        }
        updatedTemplateCount += templates.length;
      }

      return res.json({
        dryRun: req.body.dryRun,
        success: true,
        message: `${req.body.dryRun ? 'Would have': 'Successfully'} updated ${updatedTemplateCount} template versions.`,
        updatedTemplates: templateUpdatesByType,
      });
    } catch (error) {
      handleError(res, 500, `Failed to update template versions.`, error);
    }
});

module.exports = router;
