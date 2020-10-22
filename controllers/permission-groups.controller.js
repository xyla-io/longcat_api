const express = require('express');
const router = express.Router();
const acl = new(require('../modules/acl'))();
const validating = require('../modules/validating');
const {
  handleError,
  handleValidationErrors,
} = require('../modules/error');
const Permission = require('../models/permission.model').Permission;
const PermissionGroup = require('../models/permission.model').PermissionGroup;
const User = require('../models/user.model');
const Access = require('../modules/access');

let CreateGroupParameters = validating.Validating.model({
  type: 'object',
  properties: {
    displayName: {
      type: 'string',
      minLength: 1,
    },
    shortDisplayName: {
      type: 'string',
      minLength: 1,
    },
    path: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['path', 'displayName', 'shortDisplayName'],
  additionalProperties: false,
});

let EditGroupParameters = validating.Validating.model({
  type: 'object',
  properties: {
    displayName: {
      type: 'string',
      minLength: 1,
    },
    shortDisplayName: {
      type: 'string',
      minLength: 1,
    },
  },
  minProperties: 1,
  additionalProperties: false,
});

let GroupToPermissionParameters = validating.Validating.model({
  type: 'object',
  properties: {
    groupPath: {
      type: 'string',
      minLength: 1,
    },
    permissionPaths: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,  
      },
      minItems: 1,
      uniqueItems: true,
    },
  },
  required: ['groupPath', 'permissionPaths'],
  additionalProperties: false,
});

let UserToGroupParameters = validating.Validating.model({
  type: 'object',
  properties: {
    userEmail: {
      type: 'string',
      minLength: 1,
    },
    groupPath: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['userEmail', 'groupPath'],
  additionalProperties: false,
});

acl.allow([{
  roles: [acl.userRoles.super],
  allows: [
    { resources: ['/'], permissions: ['get'] },
    { resources: ['/create'], permissions: ['post'] },
    { resources: ['/associate', '/dissociate', '/grant', '/revoke'], permissions: ['patch'] },
    { resources: ['/:groupPath'], permissions: ['patch', 'delete'] },
    { resources: ['/:groupPath/grant', '/:groupPath/revoke'], permissions: ['patch'] },
  ]
}, {
  roles: [acl.roles.user],
  allows: [
    { resources: ['/associate', '/dissociate'], permissions: ['patch'] },
  ]
}]);

router.get('/', acl.middleware(), (req, res, next) => {
  PermissionGroup.getAll()
    .then(groups => {
      res.json({
        success: true,
        message: 'Successfully retrieved groups.',
        groups: groups.map(group => group.sanitizedForUser(req.user))
      });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to retrieve groups', error);
    });
});

router.post('/create', acl.middleware(), (req, res, next) => {
  let parameters = new CreateGroupParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid group creation parameters.\n\n' + errors.join('\n')); }
  let group = new PermissionGroup(parameters);
  group.save()
    .then(group => {
      res.json({
        success: true,
        message: 'Group created successfully.',
        group: group.sanitizedForUser(req.user)
      });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to create group', error);
    });
});

router.patch('/grant', acl.middleware(), (req, res, next) => {
  let parameters = new GroupToPermissionParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid group or permission parameters.\n\n' + errors.join('\n')); }

  PermissionGroup.getByPath(parameters.groupPath)
    .then(group => {
      if (!group) { throw new Error('Group not found'); }
      let existingGrantPaths = group.grants.map(grant => grant.path);
      let newGrantPaths = parameters.permissionPaths.filter(path => existingGrantPaths.indexOf(path) === -1).sort();
      if (!newGrantPaths.length) {
        res.json({
          success: false,
          message: 'Group already had permissions.',
          group: group.sanitizedForUser(req.user),
        });
      } else {
        return Permission.getManyByPaths(newGrantPaths)
          .then(permissions => {
            let permissionPaths = permissions.map(permission => permission.path).sort();
            let missingPermissionPaths = newGrantPaths.filter(path => permissionPaths.indexOf(path) === -1);
            if (missingPermissionPaths.length) { throw new Error(`Permissions not found: ${missingPermissionPaths}`); }
            let extraPermissionPaths = permissionPaths.filter(path => newGrantPaths.indexOf(path) === -1);
            if (missingPermissionPaths.length === newGrantPaths.length) { throw new Error(`Extraneous permissions found: ${extraPermissionPaths}`); }
            if (permissionPaths.length !== newGrantPaths.length) { throw new Error(`Permissions found do not match permissions requested: ${permissionPaths} is not ${newGrantPaths}`); }
            group.grants = group.grants.concat(permissions).sort((a, b) => (a.path > b.path) ? 1 : (a.path < b.path) ? -1 : 0);
            return group.save();
          })
          .then(group => {
            res.json({
              success: true,
              message: 'Group successfully granted permissions.',
              group: group.sanitizedForUser(req.user)
            });
          });
      }
    })
    .catch(error => {
      handleError(res, 500, 'Failed to grant permissions to group', error);
    });
});

router.patch('/revoke', acl.middleware(), (req, res, next) => {
  let parameters = new GroupToPermissionParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid group or permission parameters.\n\n' + errors.join('\n')); }

  PermissionGroup.getByPath(parameters.groupPath)
    .then(group => {
      if (!group) { throw new Error('Group not found'); }
      let existingGrantPaths = group.grants.map(grant => grant.path);
      let revokePaths = parameters.permissionPaths.filter(path => existingGrantPaths.indexOf(path) !== -1).sort();
      if (!revokePaths.length) {
        res.json({
          success: false,
          message: 'Group did not have permissions.',
          group: group.sanitizedForUser(req.user),
        });
      } else {
        group.grants = group.grants.filter(grant => revokePaths.indexOf(grant.path) === -1);
        return group.save()
          .then(group => {
            res.json({
              success: true,
              message: 'Permissions successfully revoked from group.',
              group: group.sanitizedForUser(req.user)
            });
          });
      }
    })
    .catch(error => {
      handleError(res, 500, 'Failed to revoke permissions from group', error);
    });
});

router.patch('/associate', acl.middleware(), (req, res, next) => {
  let parameters = new UserToGroupParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }

  let permissionError = Access.userPermissionError(req.user, parameters.groupPath, Access.actions.associate);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }

  User.getByEmail(parameters.userEmail)
    .then(user => {
      if (!user) { throw new Error('User not found'); }
      if (user.isMemberOfGroup(parameters.groupPath)) {
        res.json({
          success: false,
          message: 'User was already a group member.',
          user: user.sanitizedForUser(req.user)
        });
      } else {
        return PermissionGroup.getByPath(parameters.groupPath)
          .then(group => {
            if (!group) { throw new Error('Group not found'); }
            user.groups.push(group);
            return user.save();
          })
          .then(user => {
            res.json({
              success: true,
              message: 'User successfully added to group.',
              user: user.sanitizedForUser(req.user)
            });
          });
      }
    })
    .catch(error => {
      handleError(res, 500, 'Failed to add user to group', error);
    });
});

router.patch('/dissociate', acl.middleware(), (req, res, next) => {
  let parameters = new UserToGroupParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleValidationErrors(res, errors); }

  let permissionError = Access.userPermissionError(req.user, parameters.groupPath, Access.actions.dissociate);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }

  User.getByEmail(parameters.userEmail)
    .then(user => {
      if (!user) { throw new Error('User not found'); }
      if (!user.isMemberOfGroup(parameters.groupPath)) {
        res.json({
          success: false,
          message: 'User was not a member of group.',
          user: user.sanitizedForUser(req.user)
        });
      } else {
        user.groups = user.groups.filter(group => group.path != parameters.groupPath);
        return user.save()
          .then(user => {
            res.json({
              success: true,
              message: 'User successfully removed from group.',
              user: user.sanitizedForUser(req.user)
            });
          });
      }
    })
    .catch(error => {
      handleError(res, 500, 'Failed to remove user from group', error);
    });
});

router.patch('/:groupPath', acl.middleware(), (req, res, next) => {
  let parameters = new EditGroupParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid group edit parameters.\n\n' + errors.join('\n')); }
  PermissionGroup.getByPath(req.params.groupPath)
    .then(group => {
      if (!group) { throw new Error('Group not found'); }
      ['displayName', 'shortDisplayName'].forEach(property => {
        if (property in parameters) {
          group[property] = parameters[property];
        }
      });
      return group.save();
    })
    .then(group => {
      res.json({
        success: true,
        message: 'Group edited successfully.',
        group: group.sanitizedForUser(req.user)
      });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to edit group', error);
    });
});

router.delete('/:groupPath', acl.middleware(), (req, res, next) => {
  PermissionGroup.getByPath(req.params.groupPath)
    .then(group => {
      if (!group) { throw new Error('Group not found'); }
      return group.remove();
    })
    .then(() => {
      res.json({
        success: true,
        message: 'Group deleted.',
      });
    })
    .catch(error => handleError(res, 500, 'Failed to delete group', error));
});

module.exports = router;
