const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Sanitizing = require('../modules/sanitizing');
const PathRepresentable = require('../modules/path-representable');
const Access = require('../modules/access');

const PermissionSchema = Schema({
  displayName: {
    type: String,
    minlength: 1,
    required: 'Please provide a display name',
  },
  shortDisplayName: {
    type: String,
    minlength: 1,
    required: 'Please provide a short display name',
  },
  path: {
    type: String,
    required: 'Please provide a path',
    unique: true,
  },
  targetPathPattern: {
    type: String,
    required: 'Please provide a target path pattern.',
    minlength: 1,
  },
  actionPattern: {
    type: String,
    required: 'Please provide a target path pattern.',
    minlength: 1,
  },
});

PermissionSchema.pre('remove', function(next) {
  mongoose.model('PermissionGroup').update({ grants: this._id }, { $pull: { grants: this._id } }, { multi: true })
    .exec();
  next();
});

PermissionSchema.methods.isPermitted = function(tagetPath, action) {
  return this.targetPathPattern.length && this.actionPattern.length && tagetPath.match(this.targetPathPattern) && action.match(this.actionPattern);
};

Sanitizing.addToSchema(PermissionSchema, ['exposableProperties']);
PermissionSchema.virtual('exposableProperties').get(function() {
  return [
    'displayName',
    'shortDisplayName',
    'path',
    'targetPathPattern',
    'actionPattern',
  ];
});

PathRepresentable.addToSchema(PermissionSchema, ['path']);

let Permission = mongoose.model('Permission', PermissionSchema);

Permission.getByPath = function(path) {
  return Permission.findOne({ 'path': path });
};

Permission.getManyByPaths = function(paths) {
  return Permission.find({ 'path': { $in: paths } });
};

Permission.getAll = function() {
  return Permission.find();
};

Permission.deleteAllByCompany = async function(companyIdentifier){
  return Permission
    .deleteMany({
      path: {
        $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`
      }
    })
    .exec();
}

const PermissionGroupSchema = Schema({
  displayName: {
    type: String,
    minlength: 1,
    required: 'Please provide a display name',
  },
  shortDisplayName: {
    type: String,
    minlength: 1,
    required: 'Please provide a short display name',
  },
  path: {
    type: String,
    required: 'Please provide a path',
    unique: true,
  },
  grants: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    default: []
  },
});

PermissionGroupSchema.pre('remove', function(next) {
  mongoose.model('User').update({ groups: this._id }, { $pull: { groups: this._id } }, { multi: true })
    .exec();
  next();
});

PermissionGroupSchema.methods.isPermitted = function(tagetPath, permission) {
  for (var i = 0; i < this.grants.length; i++) {
    if (this.grants[i].isPermitted(tagetPath, permission)) { return true; }
  }
  return false;
};

Sanitizing.addToSchema(PermissionGroupSchema, ['exposableProperties']);
PermissionGroupSchema.virtual('exposableProperties').get(function() {
  return [
    'displayName',
    'shortDisplayName',
    'path',
    'grants',
  ];
});
PermissionGroupSchema.methods.sanitizedPropertyForUser = function(name, accessingUser) {
  switch (name) {
    case 'grants': return this.grants.map(permission => permission.sanitizedForUser(accessingUser));
    default: return this[name];
  }
};

PathRepresentable.addToSchema(PermissionGroupSchema, ['path']);

let PermissionGroup = mongoose.model('PermissionGroup', PermissionGroupSchema);

PermissionGroup.getByPath = function(path) {
  return PermissionGroup.findOne({ 'path': path }).populate('grants');
};

PermissionGroup.getAll = function() {
  return PermissionGroup.find().populate('grants');
};

PermissionGroup.getAllByCompany = function(companyIdentifier) {
  return PermissionGroup.find({ path: { $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`}}).populate('grants');
};

PermissionGroup.deleteAllByCompany = async function(companyIdentifier) {
  return PermissionGroup
    .deleteMany({
      path: {
        $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`
      }
    })
    .exec();
};

module.exports.Permission = Permission;
module.exports.PermissionGroup = PermissionGroup;
