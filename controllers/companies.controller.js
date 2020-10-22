const express = require('express');
const router = express.Router();
const acl = new (require('../modules/acl'))();
const validating = require('../modules/validating');
const {
  handleError,
  handleValidationErrors,
  NotFoundError,
} = require('../modules/error');
const Company = require('../models/company.model');
const User = require('../models/user.model');
const Invitation = require('../models/invitation.model');
const PermissionGroup = require('../models/permission.model').PermissionGroup;
const Access = require('../modules/access');
const Email = require('../modules/email');
const multer = require('multer');
const fs = require('fs');
const Storage = require('../modules/storage');
const InvitationEmail = require('../emails/invitation.email');
const feeds = require('./companies.feeds.controller');
const tags = require('./companies.tags.controller');
const entities = require('./companies.entities.controller');

let CreateCompanyParameters = validating.Validating.model({
  type: 'object',
  properties: {
    displayName: {
      type: 'string',
      minLength: 1,
    },
    identifier: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['displayName', 'identifier'],
  additionalProperties: false,
});

let InviteUserParameters = validating.Validating.model({
  type: 'object',
  properties: {
    inviteEmail: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['inviteEmail'],
  additionalProperties: false,
}, (instance) => User.emailValidationErrors(instance.inviteEmail));

let AcceptInviteParameters = validating.Validating.model({
  type: 'object',
  properties: {
    token: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['token'],
  additionalProperties: false,
});

let DeactivateUserParameters = validating.Validating.model({
  type: 'object',
  properties: {
    userEmail: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['userEmail'],
  additionalProperties: false,
});

let UserToCompanyParameters = validating.Validating.model({
  type: 'object',
  properties: {
    userEmail: {
      type: 'string',
      minLength: 1,
    },
    companyIdentifier: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['userEmail', 'companyIdentifier'],
  additionalProperties: false,
});

acl.allow([{
  roles: [acl.roles.guest],
  allows: [
    { resources: ['/:identifier/logo'], permissions: ['get'] },
  ]
}, {
  roles: [acl.userRoles.super],
  allows: [
    { resources: ['/'], permissions: ['get'] },
    { resources: ['/create'], permissions: ['post'] },
    { resources: ['/associate', '/dissociate'], permissions: ['patch'] },
    { resources: ['/:identifier/logo'], permissions: ['put', 'delete'] },
    // { resources: ['/:identifier'], permissions: ['delete'] },
    { resources: ['/:identifier/groups'], permissions: ['get'] },
  ]
}, {
  roles: [acl.roles.user],
  allows: [
    { resources: ['/:identifier/logo'], permissions: ['get'] },
    { resources: ['/:identifier/invite'], permissions: ['post'] },
    { resources: ['/:identifier/invite/accept'], permissions: ['post'] },
    { resources: ['/:identifier/users/deactivate'], permissions: ['patch'] },
    { resources: ['/:identifier/users'], permissions: ['get'] },
  ],
}]);

router.get('/', acl.middleware(), (req, res, next) => {
  Company.getAll()
    .then(companies => {
      res.json({
        success: true,
        message: 'Successfully retrieved companies.',
        companies: companies.map(company => company.sanitizedForUser(req.user))
      });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to retrieve companies', error);
    });
});

router.post('/create', acl.middleware(), (req, res, next) => {
  let parameters = new CreateCompanyParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid company creation parameters.\n\n' + errors.join('\n')); }
  let company = new Company(parameters);
  Company.create(company)
    .then(company => {
      res.json({
        success: true,
        message: 'Company created successfully.',
        company: company.sanitizedForUser(req.user)
      });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to create company', error);
    });
});

const logoStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    const company = Company.getByIdentifier(req.params.identifier)
      .then(company => {
        if (!company) { throw new Error('Company not found'); }
        const logoStorage = company.logoStorage;
        if (logoStorage && logoStorage.directory) {
          callback(null, logoStorage.directory);
        } else {
          throw new Error('Company logo storage directory not available.');
        }
      })
      .catch(err => {
        callback(err, null);
      });
  },
  filename: (req, file, callback) => {
    callback(null, 'logo');
  }
});

router.put('/:identifier/logo', acl.middleware(), (req, res, next) => {
  const logoFormKey = 'logo';
  const logoUpload = multer({storage: logoStorage}).single(logoFormKey);
  logoUpload(req, res, err => {
    if (err) { return handleError(res, 400, err.message); }
    return res.json({
      success: true,
      message: 'Logo uploaded successfully.',
      company: req.params.identifier,
    });
  });
});

router.get('/:identifier/logo', acl.middleware(), (req, res, next) => {

  let downloadDefaultLogo = () => {
    const uiDirectory = Storage.dirPaths.ui;
    return res.download(`${uiDirectory}/default_company_logo.png`);
  };

  Company.getByIdentifier(req.params.identifier)
    .then(company => {
      if (!company) { return handleError(res, 404, 'Company not found'); }
      const logoStorage = company.logoStorage;
      if (logoStorage && logoStorage.path) {
        fs.access(logoStorage.path, err => {
          if (err) { return downloadDefaultLogo(); }
          return res.download(logoStorage.path);
        });
      } else {
        return downloadDefaultLogo();
      }
    })
    .catch(err => {
      return handleError(res, 500, err);
    });
});

router.delete('/:identifier/logo', acl.middleware(), (req, res, next) => {
  Company.getByIdentifier(req.params.identifier)
    .then(company => {
      if (!company) { return handleError(res, 404, 'Company not found'); }
      const logoStorage = company.logoStorage;
      if (logoStorage && logoStorage.path) {
        Storage.deleteFile(logoStorage.path)
        .then (() => {
          return res.json({
            success: true,
            message: 'Company logo was deleted.',
          });
        })
        .catch(err => {
          return res.json({
            success: true,
            message: 'No company logo was found',
          });
        });
      } else {
        return handleError(res, 500, 'Logo storage not available for company');
      }
    })
    .catch(err => {
      return handleError(res, 500);
    });
});

router.post('/:identifier/invite', acl.middleware(), async (req, res, next) => {
  let permissionError = Access.userPermissionError(req.user, Access.pathFromComponents(['companies', req.params.identifier, 'users']), Access.actions.invite);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }

  let parameters = new InviteUserParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }

  parameters.inviteEmail = parameters.inviteEmail.toLowerCase();

  try {
    let company = await Company.getByIdentifier(req.params.identifier);
    if (!company) { return new NotFoundError('company', req.params.identifier).send(res, 404); }

    let existingUser = await User.getByEmail(parameters.inviteEmail);
    if (existingUser && existingUser.isAssociatedWithCompany(company.identifier)) {
      return handleError(res, 400, 'User already associated with company');
    }

    let invitation = await Invitation.getByCompanyAndEmail(company, parameters.inviteEmail);
    if (invitation === null) {
      invitation = await Invitation.fromCompanyAndEmail(company, parameters.inviteEmail);
    } else {
      invitation.invitationDate = Date.now();
    }
    let baseURL = Email.getLongcatUXBaseURL(company.identifier);
    let link = `${baseURL}/invitation/${invitation.token}?email=${encodeURIComponent(parameters.inviteEmail)}`
    let emailContent = InvitationEmail.make({
      inviterDisplayName: req.user.name,
      companyDisplayName: company.displayName,
      invitationLink: link,
    });
    Email.sendHTMLEmail(parameters.inviteEmail, emailContent.html, emailContent.subject, [], err => {
      if (err) {
        console.log(err);
        return handleError(res, 500, 'Failed to send invite email to user.');
      }
      invitation.save().then(invitation => {
        return res.json({
          success: true,
          message: 'User invitation email sent to ' + parameters.inviteEmail + '.',
          token: invitation.token,
          link: link,
        });
      })
    });
  } catch (error) {
    handleError(res, 500, 'Failed to invite user.', error);
  }
});

router.post('/:identifier/invite/accept', acl.middleware(), async (req, res, next) => {
  let parameters = new AcceptInviteParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }

  try {
    let invitation = await Invitation.getByToken(parameters.token);
    if (invitation === null || req.user.local.email !== invitation.email) {
      return new NotFoundError('token', parameters.token).send(res, 404);
    }

    const company = await Company.getByIdentifier(req.params.identifier);
    if (!company) { return new NotFoundError('company', req.params.identifier).send(res, 404); }
    if (req.user.isAssociatedWithCompany(company.identifier)) {
      let user = await req.user.addToDefaultCompanyGroups(company);
      await Invitation.remove(invitation);
      return res.json({
        success: false,
        message: 'User already associated with company',
        user: user.sanitizedForUser(req.user),
      });
    } else {
      let user = await req.user.associateWithCompany(company);
      user = await req.user.addToDefaultCompanyGroups(company);
      await Invitation.remove(invitation);
      return res.json({
        success: true,
        message: 'Invitation accepted and user added to company',
        user: user.sanitizedForUser(req.user),
      });
    }
  } catch (error) {
    handleError(res, 500, 'Failed to accept invitation.', error);
  }
});

router.patch('/:identifier/users/deactivate', acl.middleware(), async (req, res, next) => {
  let permissionError = Access.userPermissionError(
    req.user,
    Access.pathFromComponents(['companies', req.params.identifier, 'groups', '*']),
    Access.actions.dissociate);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }

  let parameters = new DeactivateUserParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }

  try {
    let user = await User.getByEmail(parameters.userEmail);
    if (!user) { return new NotFoundError('userEmail', parameters.userEmail).send(res, 404); }
    await user.removeFromAllCompanyGroups(req.params.identifier);
    return res.json({
      success: true,
      message: 'All company permission groups removed from user',
      user: user.sanitizedForUser(req.user),
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to deactivate user', error);
  }
});

router.patch('/associate', acl.middleware(), async (req, res, next) => {
  let parameters = new UserToCompanyParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid user or company parameters.\n\n' + errors.join('\n')); }

  try {
    let user = await User.getByEmail(parameters.userEmail);
    if (!user) { return new NotFoundError('userEmail', parameters.userEmail).send(res, 404); }
    if (user.isAssociatedWithCompany(parameters.companyIdentifier)) {
      return res.json({
        success: false,
        message: 'User was already associated with company.',
        user: user.sanitizedForUser(req.user)
      });
    } else {
      let company = await Company.getByIdentifier(parameters.companyIdentifier);
      if (!company) { return new NotFoundError('company', parameters.companyIdentifier).send(res, 404); }
      await user.associateWithCompany(company)
      let pendingInvitation = await Invitation.getByCompanyAndEmail(company, user.local.email);
      if (pendingInvitation) {
        await Invitation.remove(pendingInvitation);
      }
      return res.json({
        success: true,
        message: 'User successfully associated with company.',
        user: user.sanitizedForUser(req.user)
      });
    }
  } catch (error) {
    handleError(res, 500, 'Failed to associate user with company', error);
  }
});

router.patch('/dissociate', acl.middleware(), async (req, res, next) => {
  let parameters = new UserToCompanyParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid user or company parameters.\n\n' + errors.join('\n')); }

  try {
    let user = await User.getByEmail(parameters.userEmail);
    if (!user) { return new NotFoundError('userEmail', parameters.userEmail).send(res, 404); }
    user = await user.removeFromAllCompanyGroups(parameters.companyIdentifier);
    if (!user.isAssociatedWithCompany(parameters.companyIdentifier)) {
      res.json({
        success: false,
        message: 'User was not associated with company.',
        user: user.sanitizedForUser(req.user)
      });
    } else {
      user.companies = user.companies.filter(company => company.identifier != parameters.companyIdentifier);
      return user.save()
        .then(user => {
          res.json({
            success: true,
            message: 'User successfully dissociated from company.',
            user: user.sanitizedForUser(req.user)
          });
        });
    }
  } catch (error) {
    handleError(res, 500, 'Failed to dissociate user from company', error);
  }
});

router.get('/:identifier/users', acl.middleware(), async (req, res, next) => {
  let permissionError = Access.userPermissionError(req.user, Access.pathFromComponents(['companies', req.params.identifier, 'users']), Access.actions.list);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }

  try {
    let company = await Company.getByIdentifier(req.params.identifier);
    if (!company) { return new NotFoundError('company', req.params.identifier).send(res, 404); }
    let [users, invitations] = await Promise.all([User.getAllByCompanyID(company._id), Invitation.getAllByCompanyID(company._id)]);

    // Filter out 'super' users so they don't show up in the admin panel
    users = users.filter(user => !user.roles.includes('super'));

    users = users.map(user => User.filterUserForCompany(user, company.identifier));
    users = users.map(user => user.sanitizedForUser(req.user));
    res.json({
      success: true,
      message: 'Successfully retrieved company users.',
      users: users,
      invitations: invitations.map(invitation => invitation.sanitizedForUser(req.user)),
    });
  } catch (error) {
    handleError(res, 500, 'Failed to retrieve company users', error);
  }
});

router.get('/:identifier/groups', acl.middleware(), (req, res, next) => {
  let permissionError = Access.userPermissionError(req.user, Access.pathFromComponents(['companies', req.params.identifier, 'groups']), Access.actions.list);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }
  PermissionGroup.getAllByCompany(req.params.identifier)
    .then(groups => {
      res.json({
        success: true,
        message: 'Successfully retrieved company groups.',
        users: groups.map(group => group.sanitizedForUser(req.user)),
      });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to retrieve company groups', error);
    });
});

router.delete('/:identifier', acl.middleware(), (req, res, next) => {
  Company.getByIdentifier(req.params.identifier)
    .then(company => {
      if (!company) { throw new NotFoundError('Company', req.params.identifier); }
      return company.delete()
    })
    .then(() => {
      res.json({
        success: true,
        message: 'Company deleted.',
      });
    })
    .catch(error => handleError(res, 500, 'Failed to delete company', error));
});

router.use('/:identifier/feeds', feeds);
router.use('/:identifier/tags', tags);
router.use('/:identifier/entities', entities);

module.exports = router;
