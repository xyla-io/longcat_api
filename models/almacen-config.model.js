const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Sanitizing = require('../modules/sanitizing');
const PathRepresentable = require('../modules/path-representable');
const Access = require('../modules/access');
const {
  mapMongoError,
} = require('../modules/error');
const { SchedulableSchema } = require('./schemas/schedulable.schema.js');

const AlmacenConfigSchema = Schema({
  schedule: {
    type: [SchedulableSchema],
    default: [],
  },
  disabled: {
    type: 'boolean',
    default: true,
  },
  lastRunEnqueued: {
    type: Date,
    default: null,
  },
  lastRunComplete: {
    type: Date,
    default: null,
  },
  config: {
    type: Object,
    required: 'Please provide an Almacen configuration',
  },
  path: {
    type: String,
    required: 'Please provide an AlmacenConfig path',
    unique: true,
  },
});

Sanitizing.addToSchema(AlmacenConfigSchema, ['exposableProperties']);
AlmacenConfigSchema.virtual('exposableProperties').get(function() {
  return [
    'path',
    'disabled',
    'schedule',
    'lastRunEnqueued',
    'lastRunComplete',
    'config',
  ];
});

PathRepresentable.addToSchema(AlmacenConfigSchema, ['path']);

let AlmacenConfig = mongoose.model('AlmacenConfig', AlmacenConfigSchema);

AlmacenConfig.create = function(almacenConfig) {
  return almacenConfig.save()
    .catch(error => { throw mapMongoError(error); })
};

AlmacenConfig.update = function(almacenConfig) {
  return almacenConfig.save()
    .catch(error => { throw mapMongoError(error); })
};

AlmacenConfig.getByPath = function(path) {
  return AlmacenConfig.findOne({path: path});
};

AlmacenConfig.getAllByCompany = function(companyIdentifier) {
  return AlmacenConfig
    .find({ path: { $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`}})
    .sort({ 'creationTime': 1 });
};

AlmacenConfig.deleteAllByCompany = function(companyIdentifier) {
  return AlmacenConfig
    .deleteMany({
      path: {
        $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`
      }
    });
};

AlmacenConfig.pathForCompany = function(companyIdentifier) {
  return Access.pathFromComponents(['companies', companyIdentifier, 'feeds', 'core', 'config']);
};

module.exports.AlmacenConfig = AlmacenConfig;
