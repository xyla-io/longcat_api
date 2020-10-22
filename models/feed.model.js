const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Sanitizing = require('../modules/sanitizing');
const PathRepresentable = require('../modules/path-representable');
const Access = require('../modules/access');
const {
  mapMongoError,
  NotFoundError,
} = require('../modules/error');

const TableFeedSchema = Schema({
  displayName: {
    type: String,
    required: 'Please provide a display name',
  },
  description: {
    type: String,
    default: '',
  },
  path: {
    type: String,
    required: 'Please provide a feed path',
    unique: true,
  },
  tableName: {
    type: String,
    required: 'Please provide a table name',
  },
  mergeColumns: {
    type: [{ type: String }],
    default: [],
  },
  columnMappings: {
    type: Object,
    default: {},
  },
  creationTime: {
    type: Date,
    default: Date.now,
  },
  modificationTime: {
    type: Date,
    default: Date.now,
  },
});

Sanitizing.addToSchema(TableFeedSchema, ['exposableProperties']);
TableFeedSchema.virtual('exposableProperties').get(function() {
  return [
    'displayName',
    'description',
    'path',
    'tableName',
    'mergeColumns',
    'columnMappings',
    'creationTime',
    'modificationTime',
  ];
});

PathRepresentable.addToSchema(TableFeedSchema, ['path']);

let TableFeed = mongoose.model('TableFeed', TableFeedSchema);

TableFeed.create = function(newFeed) {
  return newFeed.save()
  .catch(error => { throw mapMongoError(error); });
};

TableFeed.getByPath = function(path) {
  return TableFeed.findOne({path: path});
};

TableFeed.deleteByPath = function(path) {
  return TableFeed.findOne({path: path}).then(feed => {
    if (feed === null) { throw new NotFoundError(); }
    return feed.remove();
  });
};

TableFeed.getAllByCompany = function(companyIdentifier) {
  return TableFeed
    .find({ path: { $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`}})
    .sort({ 'displayName': 1 })
    .sort({ 'creationTime': 1 });
};

TableFeed.deleteAllByCompany = function(companyIdentifier) {
  return TableFeed
    .deleteMany({
      path: {
        $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`
      }
    });
};

TableFeed.pathForCompanyAndTable = function(companyIdentifier, tableName) {
  return Access.pathFromComponents(['companies', companyIdentifier, 'feeds', 'tables', tableName]);
};

module.exports.TableFeed = TableFeed;
