const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Q = require('q');
const fs = require('fs');
const Access = require('../modules/access');
const Sanitizing = require('../modules/sanitizing');
const PathRepresentable = require('../modules/path-representable');
const Storage = require('../modules/storage');

const Permission = require('./permission.model').Permission;
const PermissionGroup = require('./permission.model').PermissionGroup;
const TableFeed = require('./feed.model').TableFeed;
const SQLQuery = require('./sql-query.model');
const QueryExport = require('./query-export.model');
const AlmacenConfig = require('./almacen-config.model').AlmacenConfig;

const CompanySchema = Schema({
  displayName: {
    type: String,
    required: 'Please provide a name',
  },
  identifier: {
    type: String,
    required: 'Please provide an identifier',
    unique: true,
  }
});

CompanySchema.pre('remove', async function(next) {

  Permission.deleteAllByCompany(this.identifier);
  PermissionGroup.deleteAllByCompany(this.identifier);
  TableFeed.deleteAllByCompany(this.identifier);
  SQLQuery.deleteAllByCompany(this.identifier);
  QueryExport.deleteAllByCompany(this.identifier);
  AlmacenConfig.deleteAllByCompany(this.identifier);

  [
    'Report',
    'Navbar',
    'Invitation',
  ].forEach(modelName => {
    mongoose.model(modelName).deleteMany({ company: this._id }).exec();
  });

  mongoose.model('User').update(
    { companies: this._id },
    { $pull: { companies: this._id } },
    { multi: true }
  ).exec();

  try {
    let result = await Storage.removeDirectoryRecursively(this.directoryPath);
  } catch (error) {
    console.error(error);
  }

  next();

});

Sanitizing.addToSchema(CompanySchema, ['exposableProperties']);
CompanySchema.virtual('exposableProperties').get(function() {
  return [
    'displayName',
    'identifier',
    'path',
  ];
});

PathRepresentable.addToSchema(CompanySchema, ['path']);
CompanySchema.virtual('path').get(function() {
  return Access.pathFromComponents(['companies', this.identifier]);
});

CompanySchema.virtual('directoryPath').get(function() {
  return Storage.pathBuilder.company(this._id.toString());
});

CompanySchema.virtual('storageDirectories').get(function() {
  const directoryPath = this.directoryPath;
  return {
    ui: `${directoryPath}/ui`,
  }
});

CompanySchema.virtual('logoStorage').get(function() {
  const uiPath = this.storageDirectories.ui;
  return {
    directory: uiPath,
    filename: 'logo',
    path: `${uiPath}/logo`,
  }
});

CompanySchema.methods.buildStorageScaffolding = function() {
  let deferred = Q.defer();
  const storageDirectories = this.storageDirectories;
  let promisedDirectories = [];
  Object.keys(storageDirectories).forEach(key => {
    promisedDirectories.push(Storage.mkdirp(storageDirectories[key]));
  });
  Q.all(promisedDirectories)
    .then(() => {
      deferred.resolve();
    })
    .catch(err => {
      deferred.reject();
    });

  return deferred.promise;
};

CompanySchema.methods.delete = async function() {
  return this.remove();
};

let Company = mongoose.model('Company', CompanySchema);

Company.create = function(newCompany) {
  let deferred = Q.defer();

  function handleErrorAfterCreation(error) {
    console.log(error);
    newCompany.delete()
      .then(() => deferred.reject(error))
      .catch(error => deferred.reject(error));      
  }

  newCompany.save()
    .then(company => {
      this.createPermissions(company.displayName, company.identifier)
        .then(permissions => this.createPermissionGroups(company.displayName, company.identifier, permissions))
        .then(() => {
          console.log('Creating company path', company.directoryPath);
          fs.mkdir(company.directoryPath, err => {
            if (err) { return handleErrorAfterCreation(err); }
            company.buildStorageScaffolding();
            deferred.resolve(company);
          });
        })
        .catch(error => handleErrorAfterCreation(error));
    })
    .catch(error => deferred.reject(error));

  return deferred.promise;
};

Company.createPermissions = function(companyDisplayName, companyIdentifier) {
  let permissions = [
    {
      path: 'view',
      shortDisplayName: 'View Company',
      targetPathPattern: '$',
      actionPattern: '^view$',
    },
    {
      path: 'reports_list',
      shortDisplayName: 'List Reports',
      targetPathPattern: '_reports$',
      actionPattern: '^list$',
    },
    {
      path: 'embeds_sign',
      shortDisplayName: 'Sign Embeds',
      targetPathPattern: '_reports_[^_]+_embeds_[^_]+_[^_]+$',
      actionPattern: '^embed$',
    },
    {
      path: 'users_invite',
      shortDisplayName: 'Invite Users',
      targetPathPattern: '_users$',
      actionPattern: '^invite$',
    },
    {
      path: 'users_associate',
      shortDisplayName: 'Associate Users',
      targetPathPattern: '_users$',
      actionPattern: '^associate$',
    },
    {
      path: 'users_dissociate',
      shortDisplayName: 'Dissociate Users',
      targetPathPattern: '_users$',
      actionPattern: '^dissociate$',
    },
    {
      path: 'users_list',
      shortDisplayName: 'List Users',
      targetPathPattern: '_users$',
      actionPattern: '^list$',
    },
    {
      path: 'groups_list',
      shortDisplayName: 'List Groups',
      targetPathPattern: '_groups$',
      actionPattern: '^list$',
    },
    {
      path: 'groups_view',
      shortDisplayName: 'View Groups',
      targetPathPattern: '_groups_[^_]+$',
      actionPattern: '^view$',
    },
    {
      path: 'groups_add_users',
      shortDisplayName: 'Add Users to Groups',
      targetPathPattern: '_groups_[^_]+$',
      actionPattern: '^associate$',
    },
    {
      path: 'groups_remove_users',
      shortDisplayName: 'Remove Users from Groups',
      targetPathPattern: '_groups_[^_]+$',
      actionPattern: '^dissociate$',
    },
    {
      path: 'groups_analyst_view',
      shortDisplayName: 'View Analysts Group',
      targetPathPattern: '_groups_analyst$',
      actionPattern: '^view$',
    },
    {
      path: 'tags_campaign_list',
      shortDisplayName: 'List Campaign Tags',
      targetPathPattern: '_tags_campaign$',
      actionPattern: '^list$',
    },
    {
      path: 'tags_ad_list',
      shortDisplayName: 'List Ad Tags',
      targetPathPattern: '_tags_ad$',
      actionPattern: '^list$',
    },
    {
      path: 'tags_campaign_edit',
      shortDisplayName: 'Edit Campaign Tags',
      targetPathPattern: '_tags_campaign$',
      actionPattern: '^edit$',
    },
    {
      path: 'tags_ad_edit',
      shortDisplayName: 'Edit Ad Tags',
      targetPathPattern: '_tags_ad$',
      actionPattern: '^edit$',
    },
    {
      path: 'tags_parsers_list',
      shortDisplayName: 'List Tag Parsers',
      targetPathPattern: '_tags_parsers$',
      actionPattern: '^list$',
    },
    {
      path: 'tags_parsers_view',
      shortDisplayName: 'View Tag Parsers',
      targetPathPattern: '_tags_parsers$',
      actionPattern: '^view$',
    },
    {
      path: 'tags_parsers_edit',
      shortDisplayName: 'Edit Tag Parsers',
      targetPathPattern: '_tags_parsers$',
      actionPattern: '^edit$',
    },
    {
      path: 'groups_tagger_view',
      shortDisplayName: 'View Taggers Group',
      targetPathPattern: '_groups_tagger$',
      actionPattern: '^view$',
    },
    {
      path: 'queries_use',
      shortDisplayName: 'Use Stored Queries',
      targetPathPattern: '_queries_[^_]+$',
      actionPattern: '^use$',
    },
    {
      path: 'feeds_view',
      shortDisplayName: 'View Data Feeds',
      targetPathPattern: '_feeds$',
      actionPattern: '^view$',
    },
    {
      path: 'exports_list',
      shortDisplayName: 'List Query Exports',
      targetPathPattern: '_exports$',
      actionPattern: '^list$',
    },
    {
      path: 'exports_view',
      shortDisplayName: 'View Query Exports',
      targetPathPattern: '_exports_[^_]+$',
      actionPattern: '^view$',
    },
    {
      path: 'feeds_tables_list',
      shortDisplayName: 'List Feed Tables',
      targetPathPattern: '_feeds_tables$',
      actionPattern: '^list$',
    },
    {
      path: 'feeds_tables_view',
      shortDisplayName: 'View Feed Tables',
      targetPathPattern: '_feeds_tables_[^_]+$',
      actionPattern: '^view$',
    },
    {
      path: 'feeds_tables_edit',
      shortDisplayName: 'Edit Feed Tables',
      targetPathPattern: '_feeds_tables_[^_]+$',
      actionPattern: '^edit',
    },
    {
      path: 'feeds_core_list',
      shortDisplayName: 'List Core Feeds',
      targetPathPattern: '_feeds_core$',
      actionPattern: '^list$',
    },
    {
      path: 'templates_reports_protected_view',
      shortDisplayName: 'View Protected Report Templates',
      targetPathPattern: '_reports_[^_]+_protected_template_[^_]+_[^_]+$',
      actionPattern: '^view$',
    },
    {
      path: 'templates_reports_protected_edit',
      shortDisplayName: 'Edit Protected Report Templates',
      targetPathPattern: '_reports_[^_]+_protected_template_[^_]+_[^_]+$',
      actionPattern: '^edit$',
    },
    {
      path: 'templates_reports_unprotected_view',
      shortDisplayName: 'View Unprotected Report Templates',
      targetPathPattern: '_reports_[^_]+_unprotected_template_[^_]+_[^_]+$',
      actionPattern: '^view$',
    },
    {
      path: 'templates_reports_unprotected_create',
      shortDisplayName: 'Create Unprotected Report Templates',
      targetPathPattern: '_reports_[^_]+_unprotected_template_[^_]+_[^_]+$',
      actionPattern: '^create$',
    },
    {
      path: 'templates_reports_unprotected_delete',
      shortDisplayName: 'Delete Unprotected Report Templates',
      targetPathPattern: '_reports_[^_]+_unprotected_template_[^_]+_[^_]+$',
      actionPattern: '^delete$',
    },
    {
      path: 'templates_reports_unprotected_edit',
      shortDisplayName: 'Edit Unprotected Report Templates',
      targetPathPattern: '_reports_[^_]+_unprotected_template_[^_]+_[^_]+$',
      actionPattern: '^edit$',
    },
  ].map(permission => {
    permission.path = `companies_${Access.escapedPathComponent(companyIdentifier)}_permissions_${permission.path}`;
    permission.displayName = `Company ${companyDisplayName} ${permission.shortDisplayName}`;
    permission.targetPathPattern = `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}${permission.targetPathPattern}`;
    return permission;
  });

  return Q.all(permissions.map(permission => Permission.collection.replaceOne({path: permission.path}, permission, {upsert: true})))
    .then(() => Permission.find({path: {$in: permissions.map(permission => permission.path)}}));
};

Company.createPermissionGroups = function(companyDisplayName, companyIdentifier, permissions) {
  function permissionIDsWithPathSuffixes(suffixes) {
    let paths = suffixes.map(suffix => `companies_${Access.escapedPathComponent(companyIdentifier)}_permissions_${suffix}`);
    let permissionObjects = permissions.filter(permission => paths.indexOf(permission.path) !== -1);
    if (permissionObjects.length !== suffixes.length) { throw 'Permission paths do not match expected paths for group' }
    return permissionObjects.map(permission => permission._id);
  }

  let groups = [
    {
      path: 'admin',
      shortDisplayName: 'Administrators',
      grants: [
        'view',
        'reports_list',
        'embeds_sign',
        'templates_reports_protected_view',
        'templates_reports_protected_edit',
        'templates_reports_unprotected_view',
        'templates_reports_unprotected_create',
        'templates_reports_unprotected_delete',
        'templates_reports_unprotected_edit',
        'users_invite',
        'users_dissociate',
        'groups_list',
        'groups_view',
        'groups_add_users',
        'groups_remove_users',
        'users_list',
        'tags_campaign_list',
        'tags_ad_list',
        'tags_campaign_edit',
        'tags_ad_edit',
      ],
    },
    {
      path: 'tagger',
      shortDisplayName: 'Taggers',
      grants: [
        'view',
        'groups_tagger_view',
        'tags_campaign_list',
        'tags_ad_list',
        'tags_campaign_edit',
        'tags_ad_edit',
        'tags_parsers_list',
        'tags_parsers_view',
        'tags_parsers_edit',
        'reports_list',
        'embeds_sign',
        'templates_reports_protected_view',
        'templates_reports_protected_edit',
        'templates_reports_unprotected_view',
        'templates_reports_unprotected_create',
        'templates_reports_unprotected_delete',
        'templates_reports_unprotected_edit',
        'feeds_view',
        'exports_list',
        'exports_view',
        'feeds_tables_list',
        'feeds_tables_view',
        'feeds_tables_edit',
        'feeds_core_list',
      ],
    },
    {
      path: 'analyst',
      shortDisplayName: 'Data Analysts',
      grants: [
        'view',
        'groups_analyst_view',
        'reports_list',
        'embeds_sign',
        'templates_reports_protected_view',
        'templates_reports_protected_edit',
        'templates_reports_unprotected_view',
        'templates_reports_unprotected_create',
        'templates_reports_unprotected_delete',
        'templates_reports_unprotected_edit',
      ],
    },
  ].map(group => {
    group.path = `companies_${Access.escapedPathComponent(companyIdentifier)}_groups_${group.path}`;
    group.displayName = `Company ${companyDisplayName} ${group.shortDisplayName}`;
    group.grants = permissionIDsWithPathSuffixes(group.grants);
    return group;
  });

  return Q.all(groups.map(group => PermissionGroup.collection.replaceOne({path: group.path}, group, {upsert: true})))
    .then(() => PermissionGroup.find({path: {$in: groups.map(group => group.path)}}).populate('grants'));
};

Company.deleteById = (id) => {
  return Company.findById(id).then(company => {
    if (company === null) { throw new Error('Failed to find company.'); }
    return company.delete();
  });
};

Company.getByIdentifier = function(identifier) {
  return Company.findOne({ 'identifier': identifier });
};

Company.getByID = function(id) {
  return Company.findById(id);
};

Company.getAll = function() {
  return Company.find();
};

module.exports = Company;
