let Protocol = function(properties, methods, protocols) {
  this.properties = (properties) ? Object.assign({}, properties) : {};
  this.methods = (methods) ? Object.assign({}, methods) : {};
  this.protocols = (protocols) ? protocols.slice() : [];
};

Protocol.prototype.addToSchema = function(schema, overrideProperties) {
  this.protocols.forEach(protocol => {
    protocol.addToSchema(schema, overrideProperties);
  });
  if (overrideProperties === undefined) {
    overrideProperties = [];
  }

  for (propertyName in this.properties) {
    if (overrideProperties.indexOf(propertyName) !== -1) { continue; }
    let property = this.properties[propertyName];
    if (property.get) {
      schema.virtual(propertyName).get(property.get);
    }
    if (property.set) {
      schema.virtual(propertyName).set(property.get);
    }
  }

  Object.assign(schema.methods, this.methods);
  return schema;
};

Protocol.prototype.addToObject = function(object) {
  this.protocols.forEach(protocol => {
    protocol.addToObject(schema);
  });

  Object.defineProperties(this.properties);
  Object.assign(object, this.methods);
  return object;
};

Object.defineProperty(Protocol.prototype, 'requiredKeys', {
  get() {
    return Object.keys(this.properties).concat(Object.keys(this.methods));
  },
});

Protocol.prototype.conforms = function(object) {
  for (var i = 0; i < this.protocols.length; i++) {
    if (!object.conforms(this.protocols[i])) { return false; }
  }

  let keys = this.requiredKeys;
  for (var i = 0; i < keys.length; i++) {
    if (!(keys[i] in object)) { return false; }
  }
  return true;
};

module.exports = Protocol;