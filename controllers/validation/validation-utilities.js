const { Validating } = require('../../modules/validating');

/**
 * An array of navigation components in which strings represent dictionary keys and numbers array indices.
 * @typedef {Array<string | number>} Location
 */

/**
 * Extract the value at a location within an object or array.
 * 
 * @param {Object | Array} instance - The object or array from which to extract the value
 * @param {Location} location - The location of the value to extract
 * @return {any} The value in `instance` at `location`, or `undefined` if `location` cannot be reached.
 */
function getLocation(instance, location) {
  if (!location.length) { return instance };
  location = location.slice();
  let component = location.shift();
  switch (typeof component) {
    case 'string': return (typeof instance === 'object') ? getLocation(instance[component], location) : undefined;
    case 'number': return (Array.isArray(instance)) ? instance[component] : undefined;
    default: throw new Error(`Unsupported location component type: ${typeof component}`);
  }
}

/**
 * Escapes a location component string so that the entire location can be represented as a dot-separated string.
 * 
 * @param {string} component - The navigation component
 * @return {string} The escaped component
 */
function escapedLocationKey(component) {
  return component
  .replace('\\', '\\\\')
  .replace('.', '\\.')
  .replace('[', '\\[')
  .replace(']', '\\]');
}

/**
 * Represent a location as a string.
 * 
 * @param {Location} location - A location to represent as a single string
 * @return {string} An unambiguous human readable string representing the location.
 */
function pathFromlocation(location) {
  let path = '';
  location.forEach(component => {
    switch (typeof component) {
      case 'string':
        path = (path.length) ? `${path}.${escapedLocationComponent(component)}` : escapedLocationComponent(component);
        break;
      case 'number':
        path = `${path}[${component}]`;
        break;
        default: throw new Error(`Unsupported location component type: ${typeof component}`);
    }
  });
}

/**
 * Generate a validation schema for a value that may require dynamic validation based on characteristics.
 * 
 * @callback locationSchemaCallback
 * @param {any} instance - A value to validate
 * @return {object} The validation schema for `instance`.
 */

/**
 * Generate a JSON schema to validate the value at a given location within a larger structure.
 * 
 * @param {any} instance - The entire structure
 * @param {Location} location - The location to validate
 * @param {object | locationSchemaCallback} locationSchema - The validation schema for the value at `location`, or a callback that accepts the value at location and returns a validation schema
 * @return {object} A validation schema to validate the value at `location` within the `instance` structure.
 */
function locationValidationSchema(instance, location, locationSchema) {
  if (typeof locationSchema === 'function') {
    locationSchema = locationSchema(getLocation(instance, location));
  }
  if (!location.length) { return locationSchema; };
  location = location.slice();
  let component = location.shift();
  switch (typeof component) {
    case 'string':
      return {
        type: 'object',
        properties: {
          [component]: locationValidationSchema(instance, location, locationSchema),
        }
      };
    case 'number':
      return {
        type: 'array',
        items: ' '.repeat(component).split().fill({}).concat([locationValidationSchema(instance, location, locationSchema)]),
      };
    default: throw new Error(`Unsupported location component type: ${typeof component}`);
  }
}

/**
 * Produce a validation model class for a value that may require dynamic validation based on its characteristics.
 * 
 * @callback validationModelFactory
 * @param {any} instance - The value to be validated
 * @return {object} A validation model class for validating `instance`.
 */

/**
 * Validate a value or collection of values within a larger structure.
 * 
 * @param {*} instance - A structure to validate
 * @param {validationModelFactory} modelFactory - The factory function for choosing validation models for each location
 * @param {Location} locatoin - The root location to validate
 * @param {boolean} isCollection - Whether `location` represents a collection, each member of which should be validated
 * @param {boolean} validateConsistency - Whether to generate consistency errors in addition to structure errors while validating
 * @return {Array<Error>} An array of validation errors, or `undefined` if no errors were found.
 */
function locationValidationErrors({ instance, modelFactory, location=[], isCollection=false, validateConsistency=false }) {
  let errors = [];
  if (isCollection) {
    let collection = getLocation(instance, location);
    let collectionKeys = (Array.isArray(collection)) ? collection.keys() : (typeof collection === 'object') ? Object.keys(collection).sort() : undefined;
    if (collectionKeys !== undefined) {
      collectionKeys.forEach(key => {
        let locationErrors = locationValidationErrors({
          instance: instance,
          modelFactory: modelFactory,
          location: location.concat(key),
          validateConsistency: validateConsistency,
        });
        if (locationErrors) {
          errors = errors.concat(locationErrors);
        }
      });
    } else {
      let schema = locationValidationSchema(instance, location, {
        oneOf: [
          {
            type: 'array',
            maxItems: 0,
          },
          {
            type: 'object',
            maxItems: 0,
          },
        ],
      });
      errors = errors.concat(Validating.validateInstance(instance, schema).schemaResult.errors);
    }
  } else {
    let Validator;
    schema = locationValidationSchema(instance, location, instance => {
      Validator = modelFactory(instance);
      return Validator.prototype.schema;
    });
    errors = errors.concat(Validating.validateInstance(instance, schema).schemaResult.errors);
    if (!errors.length && Validator.prototype.consitencyValidator) {
      let modelInstance = getLocation(instance, location);
      if (modelInstance !== undefined) {
        errors.concat(Validator.prototype.consistencyValidator(modelInstance).map(e => new Error(`${pathFromlocation(location)}: ${e}`)));
      }
    }
  }
  return (errors.length) ? errors : undefined;
}

module.exports.locationValidationErrors = locationValidationErrors;