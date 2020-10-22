const Protocol = require('./protocol');

let properties = {
  exposableProperties: {
    get: function () {
      return [];
    },
  },
};

let methods = {
  sanitizedPropertyForUser: function(name, accessingUser) {
    if (this[name] && this[name].exposableProperties) {
      let sanitizedItem = {};
      for (let prop of this[name].exposableProperties) {
        sanitizedItem[prop] = this[name][prop];
      }
      return sanitizedItem;
    }
    if (this[name] && this[name].isMongooseDocumentArray) {
      let sanitizedItems = [];
      for (let item of this[name]) {
        let sanitizedItem = {};
        if (item.exposableProperties) {
          for (let prop of item.exposableProperties) {
            sanitizedItem[prop] = item[prop];
          }
        } else {
          sanitizedItem = item;
        }
        sanitizedItems.push(sanitizedItem);
      }
      return sanitizedItems;
    }
    return this[name];
  },
  sanitizedForUser: function(accessingUser) {
    let sanitized = {};
    this.exposableProperties.forEach(property => {
      let sanitizedProperty = this.sanitizedPropertyForUser(property, accessingUser);
      if (sanitizedProperty === undefined) { return; }
      sanitized[property] = sanitizedProperty;
    });
    return sanitized;
  },
};

let Sanitizing = new Protocol(properties, methods);

module.exports = Sanitizing;
