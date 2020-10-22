const validator = new (require('jsonschema').Validator)();
const handleValidationErrors = require('./error').handleValidationErrors;

let Validating = function(data) {
  if (data && typeof data === 'object') {
    Object.assign(this, data);
    delete this.schema;
    delete this.validationErrors;
    delete this.consistencyValidator;
  }
};

Validating.prototype.schema = {
  type: 'object',
};

Validating.prototype.validationErrors = function() {
  let properties = Object.assign({}, this);
  let result = Validating.validateInstance(properties, this.schema, this.consistencyValidator);
  let errors = result.schemaResult.errors.concat(result.consistencyErrors);
  return errors.length === 0 ? undefined : errors;
};

Validating.model = function(schema, consistencyValidator) {
  let Model = function(data) {
    Validating.call(this, data);
  };

  Model.prototype = Object.create(Validating.prototype);
  Model.prototype.schema = schema;
  Model.prototype.consistencyValidator = consistencyValidator;
  Model.prototype.constructor = Model;

  return Model;
};

Validating.validateInstance = function(instance, schema, consistencyValidator) {
  let result = {
    schemaResult: validator.validate(instance, schema),
    consistencyErrors: [],
  };
  if (result.schemaResult.errors.length === 0 && consistencyValidator) {
    result.consistencyErrors = consistencyValidator(instance);
  }
  return result;
};

module.exports.Validating = Validating;

module.exports.addSchema = function(schema, key) {
  validator.addSchema(schema, key);
};

module.exports.validateParametersMiddleware = function(model) {
  return (req, res, next) => {
    let parameters = new model(req.body);
    let errors = parameters.validationErrors();
    if (errors) { return handleValidationErrors(res, errors); }  
    next();
  };
};
