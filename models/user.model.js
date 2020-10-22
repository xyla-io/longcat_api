const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;
const Q = require('q');
const fs = require('fs');
const Storage = require('../modules/storage');
const token = require('../modules/token');
const Sanitizing = require('../modules/sanitizing');
const PathRepresentable = require('../modules/path-representable');
const Acl = require('../modules/acl');
const Access = require('../modules/access');
const PermissionGroup = require('../models/permission.model').PermissionGroup;

const kResetPasswordTokenLifetime = 2 * 24 * 60 * 60 * 1000;

const ResetPasswordSchema = Schema({
  token: {
    type: String,
    required: 'Please provide a password reset token',
  },
  date: {
    type: Date,
    required: 'Please provide a password reset date',
  },
});

const UserSchema = Schema({
  local: {
    email: {
      type: String,
      required: 'Please provide an email address',
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: 'Please provide a password',
    },
  },
  roles: {
    type: [{ type: String, enum: Object.values(Acl.userRoles) }],
    defaut: [],
  },
  groups: {
    type: [{ type: Schema.Types.ObjectId, ref: 'PermissionGroup' }],
    default: []
  },
  resetPassword: ResetPasswordSchema,
  name: {
    type: String,
    required: 'Please provide a name',
  },
  companies: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Company' }],
    default: []
  },
});

UserSchema.pre('find', function(next) {
  this.populate('companies');
  this.populate({ path: 'groups', populate: { path: 'grants' } });
  next();
});

Sanitizing.addToSchema(UserSchema, ['exposableProperties']);
UserSchema.virtual('exposableProperties').get(function() {
  return [
    '_id',
    'name',
    'email',
    'roles',
    'groups',
    'companies',
  ];
});
UserSchema.methods.sanitizedPropertyForUser = function(name, accessingUser) {
  switch (name) {
    case 'companies': return this.companies
      .filter(company => !Access.userPermissionError(accessingUser, company.path, Access.actions.view))
      .map(company => company.sanitizedForUser(accessingUser));
    case 'groups': return this.groups
      .filter(group => !Access.userPermissionError(accessingUser, group.path, Access.actions.view))
      .map(group => group.sanitizedForUser(accessingUser));
    case 'roles': return (Access.userPermissionError(accessingUser, `${this.path}${Access.separator}${Access.escapedPathComponent('roles')}`, Access.actions.list)) ? undefined : this.roles;
    case 'email': return this.local.email;
    default: return this[name];
  }
};

PathRepresentable.addToSchema(UserSchema, ['path']);
UserSchema.virtual('path').get(function() {
  return Access.pathFromComponents(['users', this._id.toString()]);
});

UserSchema.methods.validatePassword = function(password, completion) {
  return bcrypt.compare(password, this.local.password, completion);
};

UserSchema.methods.userDirectoryPath = function() {
  return Storage.pathBuilder.user(this._id.toString());
};

UserSchema.methods.delete = function() {
  let userPath = this.userDirectoryPath();
  return fs.rmdir(userPath, err => {
    if (err) { console.log(err); }
    fs.access(userPath, err => {
      if (!err) { return deferred.reject(new Error('Failed to remove user directory.')); }
      return this.remove().then(
        user => deferred.resolve(user),
        err => deferred.reject(err));
    });
  });
};

UserSchema.methods.createPasswordResetToken = function() {
  return token.generateToken(64)
    .then(token => {
      this.resetPassword = {
        token: token,
        date: new Date(),
      };
      return this.save();
    });
};

UserSchema.methods.setNewPassword = function(newPassword) {
  let deferred = Q.defer();
  User.generateHash(newPassword, (err, hash) => {
    if (err) {
      return deferred.reject(err);
    }
    this.local.password = hash;
    this.resetPassword = null;
    this.save()
      .then(user => {
        deferred.resolve(user);
      })
      .catch(error => {
        deferred.reject(error);
      });
  });
  return deferred.promise;
};

UserSchema.methods.verifyPasswordResetToken = function(token) {
  if (!this.resetPassword) return false;
  let tokenAge = Date.now() - this.resetPassword.date.getTime();
  if (tokenAge > kResetPasswordTokenLifetime) { return false }
  return token === this.resetPassword.token;
};

UserSchema.methods.isMemberOfGroup = function(groupPath) {
  return this.groups.map(group => group.path).indexOf(groupPath) !== -1;
};

UserSchema.methods.isAssociatedWithCompany = function(companyIdentifier) {
  return this.companies.map(company => company.identifier).indexOf(companyIdentifier) !== -1;
};

UserSchema.methods.associateWithCompany = function(company) {
  this.companies.push(company);
  return this.save();
};

UserSchema.methods.addToDefaultCompanyGroups = async function(company) {
  let defaultGroups = [
    'tagger',
  ];

  for (let groupName of defaultGroups) {
    let group = await PermissionGroup.getByPath(Access.pathFromComponents(['companies', company.identifier, 'groups', groupName]));
    if (!group) { throw new Error('Group not found'); }
    this.groups.push(group);
  }
  return this.save();
};

UserSchema.methods.removeFromAllCompanyGroups = async function(companyIdentifier) {
  this.groups = this.groups.filter(group => {
    let groupComponents = Access.componentsFromPath(group.path);
    if (groupComponents.length > 1 && groupComponents[0] === 'companies' && groupComponents[1] === companyIdentifier) {
      return false;
    } 
    return true;
  });
  return this.save();
}


UserSchema.statics.generateHash = function(password, completion) {
  return bcrypt.hash(password, 10, completion);
};

UserSchema.statics.passwordValidationErrors = function(password) {
  let requirements = [
    { regex: /.{6}/, message: 'contain at least 6 characters' },
    { regex: /[a-z]/, message: 'contain a lower case letter' },
    { regex: /[A-Z]/, message: 'contain a capital letter' },
    { regex: /[0-9]/, message: 'contain a number' },
  ];

  let errors = [];
  requirements.forEach(requirement => {
    if (password.match(requirement.regex) !== null) { return }
    errors.push(requirement.message);
  });

  if (errors.length === 0) { return [] }
  return ['Passwords must\n' + requirements.map(requirement => requirement.message).join('\n') + '\n\nThis password does not\n' + errors.join('\n')];
};

UserSchema.statics.emailValidationErrors = function(email) {
  let emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

  if (email.match(emailRegex) !== null) { return []; }
  return ['Email address is not valid'];
}

let User = mongoose.model('User', UserSchema);

User.createUser = function(newUser) {
  let deferred = Q.defer();

  function handleDirectoryError(err) {
    console.log(err);
    newUser.delete().then(
      () => deferred.reject(err),
      err => deferred.reject(err));
  }

  newUser.save().then(
    user => {
      console.log(user.userDirectoryPath());
      let userPath = user.userDirectoryPath();
      console.log('Creating user path');
      fs.mkdir(userPath, err => {
        if (err) { return handleDirectoryError(err); }
        deferred.resolve(user);
      });
    },
    err => deferred.reject(err));

  return deferred.promise;
};

User.deleteById = (id) => {
  return User.findById(id).then(user => {
    if (user === null) { throw new Error('Failed to find user.'); }
    return user.delete();
  });
};

User.getByEmail = function(email) {
  return User.findOne({ 'local.email': email.toLowerCase() }).populate('companies').populate({ path: 'groups', populate: { path: 'grants' } });
};

User.getByID = function(userID) {
  return User.findById(userID).populate('companies').populate({ path: 'groups', populate: { path: 'grants' } });
};

User.getAllByCompanyID = function(companyID) {
  return User.find({ 'companies': companyID }).populate('companies').populate({ path: 'groups', populate: { path: 'grants' } });
};

User.getAll = function() {
  return User.find().populate('companies').populate({ path: 'groups', populate: { path: 'grants' } });
};

User.filterUserForCompany = function(user, companyIdentifier) {
  user.groups = user.groups.filter(group => {
    let groupComponents = Access.componentsFromPath(group.path);
    if (groupComponents.length > 1 && groupComponents[0] === 'companies' && groupComponents[1] === companyIdentifier) {
      return true;
    } 
    return false;
  });
  user.companies = user.companies.filter(company => {
    return company.identifier === companyIdentifier;
  });
  return user;
};

module.exports = User;
