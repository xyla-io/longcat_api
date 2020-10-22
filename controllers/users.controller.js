const express = require('express');
const router = express.Router();
const passport = require('passport');
const acl = new(require('../modules/acl'))();
const owner = require('../modules/owner');
const User = require('../models/user.model');
const validating = require('../modules/validating');
const { handleError } = require('../modules/error');
const Email = require('../modules/email');
const debugConfig = require('../config/debug.config');
const Access = require('../modules/access');

let SignUpParameters = validating.Validating.model({
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
    },
    email: {
      type: 'string',
      minLength: 1,
    },
    password: {
      type: 'string',
    },
    confirmedPassword: {
      type: 'string',
    },
  },
  required: ['name', 'email', 'password', 'confirmedPassword'],
  additionalProperties: false,
}, (instance) => {
  let emailErrors = User.emailValidationErrors(instance.email);
  if (emailErrors.length) { return emailErrors; }
  if (instance.password !== instance.confirmedPassword) { return ['instance.password must equal instance.confirmedPassword']; }
  return User.passwordValidationErrors(instance.password);
});

let SignInParameters = validating.Validating.model({
  type: 'object',
  properties: {
    email: {
      type: 'string',
      minLength: 1,
    },
    password: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['email', 'password'],
  additionalProperties: false,
});

let ForgotPasswordParameters = validating.Validating.model({
  type: 'object',
  properties: {
    site: {
      type: 'string',
      pattern: '^[a-z\-]*$',
    },
    email: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['site', 'email'],
  additionalProperties: false,
});

let ResetPasswordParameters = validating.Validating.model({
  type: 'object',
  properties: {
    userID: {
      type: 'string',
      minLength: 1,
    },
    token: {
      type: 'string',
      minLength: 1,
    },
    password: {
      type: 'string',
    },
    confirmedPassword: {
      type: 'string',
    },
  },
  required: ['userID', 'token', 'password', 'confirmedPassword'],
  additionalProperties: false,
}, (instance) => {
  if (instance.password !== instance.confirmedPassword) { return ['instance.password must equal instance.confirmedPassword']; }
  return User.passwordValidationErrors(instance.password);
});

let RoleToUserParameters = validating.Validating.model({
  type: 'object',
  properties: {
    userEmail: {
      type: 'string',
      minLength: 1,
    },
    role: {
      type: 'string',
      enum: Object.values(acl.userRoles),
    },
  },
  required: ['userEmail', 'role'],
  additionalProperties: false,
});


acl.allow([{
    roles: [acl.roles.guest],
    allows: [
      { resources: ['/signup', '/signin', '/forgot-password', '/reset-password'], permissions: ['post'] },
      { resources: ['/session'], permissions: ['get'] },
    ]
  },
  {
    roles: [acl.roles.user],
    allows: [
      { resources: ['/session'], permissions: ['get', 'delete'] },
    ]
  },
  {
    roles: [acl.userRoles.super],
    allows: [
      { resources: ['/grant', '/revoke'], permissions: ['patch'] },
      { resources: ['/'], permissions: ['get'] },
    ]
  },
]);

router.get('/', acl.middleware(), (req, res, next) => {
  let permissionError = Access.userPermissionError(req.user, Access.pathFromComponents(['users']), Access.actions.list);
  if (permissionError) { return handleError(res, 403, 'Permission denied.', permissionError); }
  User.getAll()
    .then(users => {
      let sanitizedUsers = users.map(user => user.sanitizedForUser(req.user));
      res.json({
        success: true,
        message: 'Successfully retrieved users.',
        users: sanitizedUsers,
      });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to retrieve users', error);
    });
});

router.post('/signup', acl.middleware(), (req, res, next) => {
  let parameters = new SignUpParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid sign up parameters.\n\n' + errors.join('\n')); }

  parameters.email = parameters.email.toLowerCase();

  passport.authenticate('local-signup', (err, user, info) => {
    if (err) {
      res.status(500).json({
        success: false,
        message: `Failed to create a new user. Error: ${err}`,
        user: null
      });
    } else if (user !== false) {
      let mailBody = `A new user signed up for Xyla from ${req.get('origin')}.\n\n${user.name}\n${user.local.email}`;
      Email.sendEmail(debugConfig.debugEmailTo, mailBody, 'New Xyla User', [], err => {
        if (err) {
          console.log(err);
        }
      });
      req.logIn(user, err => {
        if (err) {
          res.status(500).json({
            success: false,
            message: `Failed to create a new user. Error: ${err}`,
            user: null
          });
        } else {
          res.json({
            success: true,
            message: 'User created successfully.',
            user: user.sanitizedForUser(req.user)
          });
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: info.message,
        user: null,
      })
    }
  })(req, res, next);
});

router.post('/signin', acl.middleware(), (req, res, next) => {
  let parameters = new SignInParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid sign in parameters.\n\n' + errors.join('\n')); }
  passport.authenticate('local-signin', (err, user, info) => {
    if (err) {
      res.status(500).json({
        success: false,
        message: `Failed to sign in user. Error: ${err}`,
        user: null
      });
    } else if (user !== false) {
      req.logIn(user, err => {
        if (err) {
          res.status(500).json({
            success: false,
            message: `Failed to sign in user. Error: ${err}`,
            user: null
          });
        } else {
          res.json({
            success: true,
            message: 'User signed in successfully.',
            user: user.sanitizedForUser(req.user)
          });
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: info.message,
        user: null
      });
    }
  })(req, res, next);
});

router.post('/reset-password', acl.middleware(), (req, res, next) => {
  let parameters = new ResetPasswordParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid forgot password parameters.\n\n' + errors.join('\n')); }
  User.getByID(parameters.userID)
    .then(user => {
      if (!user) {
        return res.json({
          success: false,
          title: 'Unrecognized User',
          message: 'The user is not on file.',
        });
      }
      if (!user.verifyPasswordResetToken(parameters.token)) {
        return res.json({
          success: false,
          title: 'Invalid Link',
          message: 'This password reset link is not valid. It may have expired or already been used.',
        });
      }
      user.setNewPassword(parameters.password)
        .then(() => {
          res.json({
            success: true,
            title: 'Password Reset',
            message: 'Your password has been reset. Please log in.',
          });
        })
        .catch(error => {
          handleError(res, 500, 'Failed to set new password for user', error);
        });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to retrieve user', error);
    })
});

router.post('/forgot-password', acl.middleware(), (req, res, next) => {
  let parameters = new ForgotPasswordParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid forgot password parameters.\n\n' + errors.join('\n')); }
  User.getByEmail(parameters.email)
    .then(user => {
      if (!user) {
        res.json({
          success: false,
          title: 'Unrecognized Email',
          message: 'Sorry, the email address ' + parameters.email + ' is not on file.',
        });
        return;
      }
      user.createPasswordResetToken()
        .then(user => {
          let baseURL = Email.getLongcatUXBaseURL(parameters.site);
          let link = `${baseURL}/reset-password/${user._id}/${user.resetPassword.token}`;
          let mailBody = `A password reset has been requested for ${user.local.email} at Xyla. To reset your password, please follow the link below:\n\n${link}`;
          console.log(mailBody);
          Email.sendEmail(user.local.email, mailBody, 'Xyla Password Reset', [], err => {
            if (err) {
              console.log(err);
              handleError(res, 500, 'Failed to send password reset email to user. ');
              return;
            }
            res.json({
              success: true,
              title: 'Email Sent',
              message: 'A password reset email has been sent to ' + parameters.email + '.',
            });
          });
        })
        .catch(error => {
          console.log(error);
          handleError(res, 500, 'Failed to set a password reset token for user.');
        });
    })
    .catch(error => {
      handleError(res, 500, 'Failed to retrieve user', error);
    })
});

router.get('/session', acl.middleware(), (req, res, next) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      message: 'User session retrieved.',
      user: req.user.sanitizedForUser(req.user),
    });
  } else {
    res.json({
      success: false,
      message: `No user session available.`,
      user: null,
    });
  }
});

router.delete('/session', acl.middleware(), (req, res, next) => {
  req.logout();
  res.json({
    success: true,
    message: 'User signed out.',
  });
});

router.patch('/grant', acl.middleware(), (req, res, next) => {
  let parameters = new RoleToUserParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid user or role parameters.\n\n' + errors.join('\n')); }

  User.getByEmail(parameters.userEmail)
    .then(user => {
      if (user.roles.indexOf(parameters.role) !== -1) {
        res.json({
          success: false,
          message: 'User already had role.',
          user: user.sanitizedForUser(req.user)
        });
      } else {
        user.roles.push(parameters.role);
        return user.save()
          .then(user => {
            res.json({
              success: true,
              message: 'Role successfully granted to user.',
              user: user.sanitizedForUser(req.user)
            });
          });
      }
    })
    .catch(error => {
      handleError(res, 500, 'Failed to grant role to user', error);
    });
});

router.patch('/revoke', acl.middleware(), (req, res, next) => {
  let parameters = new RoleToUserParameters(req.body);
  let errors = parameters.validationErrors();
  if (errors) { return handleError(res, 400, 'Invalid user or role parameters.\n\n' + errors.join('\n')); }

  User.getByEmail(parameters.userEmail)
    .then(user => {
      if (user.roles.indexOf(parameters.role) === -1) {
        res.json({
          success: false,
          message: 'User did not have role.',
          user: user.sanitizedForUser(req.user)
        });
      } else {
        user.roles = user.roles.filter(role => role !== parameters.role);
        user.save()
          .then(user => {
            res.json({
              success: true,
              message: 'Role successfully revoked from user.',
              user: user.sanitizedForUser(req.user)
            });
          });
      }
    })
    .catch(error => {
      handleError(res, 500, 'Failed to revoke role from user', error);
    });
});

router.delete('/:id', acl.middleware(0), owner.middleware('users', '_id'), (req, res, next) => {
  User.deleteById(req.params.id).then(
    () => res.json({
      success: true,
      message: 'User account deleted.',
    }),
    err => {
      console.log(err);
      res.status(500).json({
        success: false,
        message: `Failed to delete user account. Error: ${err}.`,
      });
    });
});

module.exports = router;
