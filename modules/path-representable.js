const Protocol = require('./protocol');

let properties = {
  path: {
    get: function () {
      return '';
    },
  },
};

let PathRepresentable = new Protocol(properties);

module.exports = PathRepresentable;