const acl = require('acl');

var Acl = function() {
  this.roles = Acl.roles;
  this.userRoles = Acl.userRoles;

  this.aclInstance = new acl(new acl.memoryBackend());
  this.aclInstance.addUserRoles(this.roles.user, this.roles.user);
  this.aclInstance.addUserRoles(this.roles.guest, this.roles.guest);
};

Acl.roles = {
  user: 'user',
  guest: 'guest',
};

Acl.userRoles = {
  super: 'super',
};

Acl.prototype.allow = function() {
  this.aclInstance.allow.apply(this.aclInstance, arguments);
};

Acl.prototype.middleware = function(numberOfPathComponents, denyMiddleWare) {
  return (req, res, next) => {
    let roles = (req.isAuthenticated()) ? [this.roles.user].concat(req.user.roles) : [this.roles.guest];
    let resource = (numberOfPathComponents === undefined) ? req.route.path :
      (numberOfPathComponents === 0) ? '/' :
      req.route.path.split('/').slice(0, numberOfPathComponents + 1).join('/');

    // Check for user roles
    this.aclInstance.areAnyRolesAllowed(roles, resource, req.method.toLowerCase(), function(err, isAllowed) {
      if (err) {
        // An authorization error occurred.
        return res.status(500).send('Unexpected authorization error');
      } else {
        if (isAllowed) {
          // Access granted! Invoke next middleware
          return next();
        } else if (denyMiddleWare !== undefined) {
          denyMiddleWare(req, res, next);
        } else {
          return res.status(403).json({
            message: 'User is not authorized',
          });
        }
      }
    });
  };
};

Acl.prototype.socketMiddleware = function(numberOfPathComponents, denyMiddleWare) {
  return (path, context, next) => {
    let roles = (context.isAuthenticated()) ? [this.roles.user] : [this.roles.guest];
    let resource = (numberOfPathComponents === undefined) ? path :
      (numberOfPathComponents === 0) ? '/' :
      path.split('/').slice(0, numberOfPathComponents + 1).join('/');

    // Check for user roles
    this.aclInstance.areAnyRolesAllowed(roles, resource, 'socket', function(err, isAllowed) {
      if (err) {
        // An authorization error occurred.
        return context.error('Unexpected authorization error');
      } else {
        if (isAllowed) {
          // Access granted! Invoke next middleware
          return next();
        } else if (denyMiddleWare !== undefined) {
          denyMiddleWare(path, context, next);
        } else {
          return context.error('User is not authorized');
        }
      }
    });
  };
};

module.exports = Acl;