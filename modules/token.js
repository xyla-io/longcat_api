const crypto = require('crypto');
const Q = require('q');

module.exports.generateToken = function(byteLength) {
  let deferred = Q.defer();
  crypto.randomBytes(byteLength, (err, buf) => {
    if (err) {
      deferred.reject(err);
      return;
    }
    let token = buf.toString('hex');
    deferred.resolve(token)
  });

  return deferred.promise;
};