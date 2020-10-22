const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Sanitizing = require('../modules/sanitizing');
const PathRepresentable = require('../modules/path-representable');
const Access = require('../modules/access');
const {
  mapMongoError,
  NotFoundError,
} = require('../modules/error');

const QueryExportSchema = Schema({
  displayName: {
    type: String,
    required: 'Please provide a display name',
  },
  description: {
    type: String,
    default: '',
  },
  query: {
    type: Schema.Types.ObjectId,
    ref: 'SQLQuery',
    required: 'Please provide a SQLQuery reference',
  },
  path: {
    type: String,
    required: 'Please provide a resource path',
    unique: true,
  },
  creationTime: {
    type: Date,
    default: Date.now,
  },
  lastExportTime: {
    type: Date,
    default: Date.now,
  },
});

QueryExportSchema.pre(['find', 'findOne'], function(next) {
  this.populate('query');
  next();
});

Sanitizing.addToSchema(QueryExportSchema, ['exposableProperties']);
QueryExportSchema.virtual('exposableProperties').get(function() {
  return [
    'displayName',
    'description',
    'path',
    'query',
    'creationTime',
    'lastExportTime',
  ];
});

QueryExportSchema.methods.sanitizedPropertyForUser = function(name, accessingUser) {
  switch (name) {
    case 'query': return this.query.sanitizedForUser(accessingUser);
    default: return this[name];
  }
};

PathRepresentable.addToSchema(QueryExportSchema, ['path']);

let QueryExport = mongoose.model('QueryExport', QueryExportSchema);

QueryExport.create = async function(newQueryExport) {
  return newQueryExport.save().then(queryExport => {
    return QueryExport.populate(queryExport, { path: 'query' });
  }).catch(error => { throw mapMongoError(error); });
};

QueryExport.getByPath = async function(path) {
  return QueryExport.findOne({path: path});
};

QueryExport.deleteByPath = async function(path) {
  return QueryExport.findOne({path: path}).then(queryExport => {
    if (queryExport === null) { throw new NotFoundError('QueryExport', path); }
    return queryExport.remove();
  });
};

QueryExport.getAllByCompany = async function(companyIdentifier) {
  return QueryExport
    .find({ path: { $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`}})
    .sort({ 'displayName': 1 })
    .sort({ 'creationTime': 1 });
};

QueryExport.deleteAllByCompany = async function(companyIdentifier) {
  return QueryExport
    .deleteMany({
      path: {
        $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`
      }
    })
    .exec();
};
 
module.exports = QueryExport;
