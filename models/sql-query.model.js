const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Sanitizing = require('../modules/sanitizing');
const PathRepresentable = require('../modules/path-representable');
const Access = require('../modules/access');
const knex = require('knex')({client: 'postgres'});
const {
  sqlFromCases,
  sqlFromRowFilter,
} = require('../modules/query');
const {
  mapMongoError,
  NotFoundError,
  QueryCompositionError,
} = require('../modules/error');
const { deduplicateTemplatesByIdentifier } = require('../modules/template');

const SQLQuerySchema = Schema({
  query: {
    type: String,
    required: function() { return !this.composition; }
  },
  composition: {
    type: Object,
    required: function() { return !this.query; }
  },
  description: {
    type: String
  },
  path: {
    type: String,
    required: 'Please provide a query path',
    unique: true,
  }
}, { minimize: false });

Sanitizing.addToSchema(SQLQuerySchema, ['exposableProperties']);
SQLQuerySchema.virtual('exposableProperties').get(function() {
  return [
    'query',
    'composition',
    'description',
    'path'
  ];
});

PathRepresentable.addToSchema(SQLQuerySchema, ['path']);

function composeDateFilter({ interval, dateColumn='daily_cohort' }) {
  if (!interval) { return ''; }
  switch (interval.unit) {
    case 'day':
      return `${dateColumn} >= current_timestamp - interval '${interval.value} ${interval.unit}'`;
    case 'range':
      const dateStringFromDate = (date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
      const start = dateStringFromDate(new Date(interval.value.start));
      const end = dateStringFromDate(new Date(interval.value.end));
      return `${dateColumn} >= '${start}' and ${dateColumn} <= '${end}'`;
    default:
      return '';
  }
}

/**
 * Generate the raw SQL based on the `composition` property of the SQLQuery document or return the `sql` string property if it exists.
 *
 * Note: The security of the `schema` param in any given execution must be determined prior to calling this method.
 *
 * @param {string} options - An object that defines the options to use when composing the query
 * @param {string} options.schema - The database schema to use when generating the query
 * @param {object} options.parameters - Parameters that override any defaults set in the SQLQuery's composition object
 * @return {string} The raw SQL string generated from the SQLQuery's composition object. If the SQLQuery contains a truthy value in its `query` property, that will be returned instead.
 */
SQLQuerySchema.methods.compose = function({ schema, parameters={}, ...extras } = {}) {
  if (this.query) { return this.query; }
  if (!schema && !this.composition.schema) {
    throw new QueryCompositionError(`No schema defined for query`);
  }
  let interval;
  if (parameters.interval) {
    interval = parameters.interval;
  } else if (this.composition.parameters.interval) {
    interval = this.composition.parameters.interval;
  }

  let rowFilters = deduplicateTemplatesByIdentifier(parameters.rowFilters || [], this.composition.parameters.rowFilters || []);

  const builder = knex.select(knex.raw(Object.entries(this.composition.columns).map(([columnName, column]) => {
    if (column.sql) {
      return column.sql;
    } else if (column.cases) {
      return `${sqlFromCases(column.cases)} as ${columnName}`;
    } else {
      throw new QueryCompositionError(`Each column requires a 'sql' or 'cases' property`);
    }
  }).join(', ')));
  builder.from(`${schema}.${this.composition.table}`)
  const dateFilter = composeDateFilter({ interval });
  if (dateFilter) { builder.whereRaw(dateFilter); }
  
  rowFilters.forEach(rowFilter => {
    builder.whereRaw(sqlFromRowFilter(rowFilter));
  })

  const raw = builder.toString();
  console.log(raw);
  return raw;
};

let SQLQuery = mongoose.model('SQLQuery', SQLQuerySchema);

SQLQuery.create = function(newQuery) {
  return newQuery.save()
    .catch(error => { throw mapMongoError(error); });
};

SQLQuery.getByPath = function(path) {
  return SQLQuery.findOne({path: path});
};

SQLQuery.deleteByPath = function(path) {
  return SQLQuery.findOne({path: path}).then(query => {
    if (query === null) { throw new NotFoundError('SQLQuery', path); }
    return query.remove();
  });
};

SQLQuery.getAllByCompany = function(companyIdentifier) {
  return SQLQuery
    .find({ path: { $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`}})
    .sort({ 'path': 1 });
};

SQLQuery.getAllGlobals = function() {
  return SQLQuery
    .find({ path: { $regex: `^global_`}})
    .sort({ 'path': 1 });
};

SQLQuery.deleteAllByCompany = async function(companyIdentifier) {
  return SQLQuery
    .deleteMany({
      path: {
        $regex: `^companies_${Access.regExpEscapedPathComponent(companyIdentifier)}_`
      }
    })
    .exec();
};


module.exports = SQLQuery;
