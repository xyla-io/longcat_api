const mongoose = require('mongoose'); const Schema = mongoose.Schema;
const Sanitizing = require('../modules/sanitizing');
const PathRepresentable = require('../modules/path-representable');
const Access = require('../modules/access');
const {
  mapMongoError,
  NotFoundError,
} = require('../modules/error');

const NavbarSchema = Schema({
  nodes: {
    type: [{
      identifier: {
        type: String,
        required: 'Please provide a node identifier',
      },
      targets: [{
        displayName: {
          type: String,
          required: function() { return this.type === 'node' },
        },
        type: {
          type: String,
          enum: ['report', 'node'],
          required: true,
        },
        identifier: {
          type: String,
          required: 'Please provide an identifier that references a target',
        },
      }]
    }],
    required: 'Please provide navbar nodes',
  },
  type: {
    type: String,
    enum: ['reports'],
    required: 'Please provide a navbar type',
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: 'Please provide a company',
  },
}, {minimize: false});

Sanitizing.addToSchema(NavbarSchema, ['exposableProperties']);
NavbarSchema.virtual('exposableProperties').get(function() {
  return [
    'nodes',
  ];
});

PathRepresentable.addToSchema(NavbarSchema, ['path']);

let Navbar = mongoose.model('Navbar', NavbarSchema);

Navbar.fromParameters = function(company, type, parameters) {
  if (!company) { throw new Error('Company is required.') };
  if (!type) { throw new Error('Navbar type is required.') };
  const navbar = new Navbar({
    company: company._id,
    type: type,
    nodes: parameters.nodes,
  });
  return navbar;
};

Navbar.create = function(navbar) {
  return navbar.save()
  .catch(error => { throw mapMongoError(error); });
};

Navbar.update = function(navbar) {
  return navbar.save()
  .catch(error => { throw mapMongoError(error); });
};

Navbar.deleteByCompany = function(company, type) {
  if (!company) { throw new Error('Company is required.') };
  if (!type) { throw new Error('Navbar type is required.') };
  return Navbar.findOne({company: company, type: type}).then(navbar => {
    if (navbar === null) { throw new NotFoundError('navbar', company.identifier); }
    return navbar.remove();
  });
};

Navbar.getByCompany = function(company, type) {
  if (!company) { throw new Error('Company is required.') };
  if (!type) { throw new Error('Navbar type is required.') };
  return Navbar.findOne({
    company: company,
    type: type,
  }, {
    "nodes.targets._id": 0,
    "nodes._id": 0,
  });
};

module.exports = Navbar;
