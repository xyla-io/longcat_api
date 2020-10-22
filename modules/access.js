const escapeRegExp = require('escape-regexp');
const Acl = require('../modules/acl');
const handlePermissionError = require('./error').handlePermissionError;

module.exports.separator = '_';

module.exports.actions = {
  view: 'view',
  list: 'list',
  select: 'select',
  create: 'create',
  delete: 'delete',
  edit: 'edit',
  embed: 'embed',
  associate: 'associate',
  dissociate: 'dissociate',
  invite: 'invite',
  use: 'use',
};

module.exports.pathFromComponents = function(components) {
  return components.map(component => this.escapedPathComponent(component)).join(this.separator);
};

module.exports.componentsFromPath = function(path) {
  return path.split(this.separator).map(escapedComponent => this.unescapedPathComponent(escapedComponent));
};

module.exports.escapedPathComponent = function(component) {
  return component.replace(/-/g, '-2D').replace(/_/g, '-5F');
};

module.exports.regExpEscapedPathComponent = function(component) {
  return escapeRegExp(this.escapedPathComponent(component));
};

module.exports.unescapedPathComponent = function(component) {
  return component.replace(/-5F/g, '_').replace(/-2D/g, '-');
};

module.exports.userPermissionError = function(user, targetPath, action) {
  if (!user) { return Error('Permission denied for anonymous user'); }
  if (user.roles.indexOf(Acl.userRoles.super) !== -1) { return null; }
  for (var key in this.actions) {
    if (this.actions[key] === action) {
      for (var i = 0; i < user.groups.length; i++) {
        if (user.groups[i].isPermitted(targetPath, action)) { return null; }
      }
      let ownRegExp = new RegExp(`^users_${this.regExpEscapedPathComponent(user._id.toString())}_`);
      if (targetPath.match(ownRegExp)) {
        let ownTargetPath = targetPath.replace(ownRegExp, 'own_');
        return this.userPermissionError(user, ownTargetPath, action);
      } else {
        return new Error('Permission denied for user');
      }
    }
  }
  return new Error(`Unknown permission action: ${action}`)
};

module.exports.checkUserPermission = function(res, user, targetPathOrComponents, action) {
  const targetPath = (Array.isArray(targetPathOrComponents)) ? module.exports.pathFromComponents(targetPathOrComponents) : targetPathOrComponents;
  let permissionError = module.exports.userPermissionError(user, targetPath, action);
  if (permissionError) {
    handlePermissionError(res, permissionError);
    return false;
  } else {
    return true;
  }
};

module.exports.userPermissionMiddleware = function(targetPathOrComponentsOrCallback, action) {
  return (req, res, next) => {
    let targetPathOrComponents = (Array.isArray(targetPathOrComponentsOrCallback) || typeof targetPathOrComponentsOrCallback === 'string') ? targetPathOrComponentsOrCallback : targetPathOrComponentsOrCallback(req);
    if (module.exports.checkUserPermission(res, req.user, targetPathOrComponents, action)) {
      next();
    }
  };
};

module.exports.isGlobalPath = function(targetPath) {
  return targetPath.startsWith('global_');
};
