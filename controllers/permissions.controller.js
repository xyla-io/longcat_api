const express = require('express');
const router = express.Router();
const acl = new(require('../modules/acl'))();
const validating = require('../modules/validating');
const handleError = require('../modules/error').handleError;
const Permission = require('../models/permission.model').Permission;
const premissoinGroupsRouter = require('./permission-groups.controller');

let CreatePermissionParameters = validating.Validating.model({
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
    targetPathPattern: {
      type: 'string',
      minLength: 1,
    },
    actionPattern: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['path', 'displayName', 'shortDisplayName', 'targetPathPattern', 'actionPattern'],
  additionalProperties: false,
});

let EditPermissionParameters = validating.Validating.model({
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
    targetPathPattern: {
      type: 'string',
      minLength: 1,
    },
    actionPattern: {
      type: 'string',
      minLength: 1,
    },
  },
  minProperties: 1,
  additionalProperties: false,
});

acl.allow([{
  roles: [acl.userRoles.super],
  allows: [
    { resources: ['/'], permissions: ['get'] },
    { resources: ['/create'], permissions: ['post'] },
    { resources: ['/:permissionPath'], permissions: ['patch', 'delete'] },
  ]
}, ]);

router.get('/', acl.middleware(), (req, res, next) => {
  Permission.getAll()
    .then(permissions => {
      res.json({
        success: true,
        message: 'Successfully retrieved permissions.',
        permissions: permissions.map(permission => permission.sanitizedForUser(req.user))
      });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to retrieve permissions', error);
    });
});

router.post('/create', acl.middleware(), (req, res, next) => {
  let parameters = new CreatePermissionParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid permission creation parameters.\n\n' + errors.join('\n')); }
  let permission = new Permission(parameters);
  permission.save()
    .then(permission => {
      res.json({
        success: true,
        message: 'Permission created successfully.',
        permission: permission.sanitizedForUser(req.user)
      });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to create permission', error);
    });
});

router.patch('/:permissionPath', acl.middleware(), (req, res, next) => {
  let parameters = new EditPermissionParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid permission edit parameters.\n\n' + errors.join('\n')); }
  Permission.getByPath(req.params.permissionPath)
    .then(permission => {
      if (!permission) { throw new Error('Permission not found'); }
      ['displayName', 'shortDisplayName', 'targetPathPattern', 'actionPattern'].forEach(property => {
        if (property in parameters) {
          permission[property] = parameters[property];
        }
      });
      return permission.save();
    })
    .then(permission => {
      res.json({
        success: true,
        message: 'Permission edited successfully.',
        permission: permission.sanitizedForUser(req.user)
      });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to edit permission', error);
    });
});

router.delete('/:permissionPath', acl.middleware(), (req, res, next) => {
  Permission.getByPath(req.params.permissionPath)
    .then(permission => {
      if (!permission) { throw new Error('Permission not found'); }
      return permission.remove();
    })
    .then(() => {
      res.json({
        success: true,
        message: 'Permission deleted.',
      });
    })
    .catch(error => handleError(res, 500, 'Failed to delete permission', error));
});

router.use('/groups', premissoinGroupsRouter);

module.exports = router;