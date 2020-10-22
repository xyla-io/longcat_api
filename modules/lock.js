const uuid = require('uuid').v4;

/**
 * The result of a lock or unlock operation.
 * 
 * @typedef {object} PathLockResult
 * @property {string} lockID - The lock ID for which the operation was performed, or `null` if the operation failed
 * @property {Array<string>} paths - The locked or unlocked paths
 * @property {Date} expire - The lock expiration date
 */

/**
 * A lock object for locking and unlocking multiple paths.
 * 
 * @class PathLock
 */
function PathLock() {
  this.locks = {};
}

/**
 * Generate a unique lock ID.
 * 
 * @return {string} The universally unique lock ID.
 */
PathLock.lockID = function() {
  return uuid().toString();
}

/**
 * Attempt to lock a set of paths.
 * 
 * @param {Array<string>} paths - Paths on which to acquire a lock
 * @param {string} lockID - The lock ID; pass `null` to generate a new lock ID
 * @param {Date} expire - The lock expiration date; pass `null` to use a date 10 seconds from now
 * @return {PathLockResult} The result of the lock attempt.
 */
PathLock.prototype.lock = function({ paths, lockID=null, expire=null}) {
  if (lockID === null) {
    lockID = PathLock.lockID();
  }
  if (expire === null) {
    expire = new Date();
    expire.setSeconds(expire.getSeconds() + 10);
  }
  if (!Array.isArray(paths)) {
    throw new Error('Missing paths for path lock.');
  }
  this.unlock({ lockID: lockID, paths: paths });
  let lockedPaths = Object.keys(this.locks).filter(p => paths.includes(p)).sort();
  if (lockedPaths.length) {
    return {
      lockID: null,
      paths: lockedPaths,
      expire: lockedPaths.reduce((date, path) => {
        const pathDate = this.locks[path].expire;
        if (date === null) {
          return pathDate;
        } else {
          return (pathDate > date) ? pathDate : date;
        }
      }, null),
    }  
  }
  for (path of paths) {
    this.locks[path] = {
      lockID: lockID,
      expire: expire,
    };
  }
  return {
    lockID: lockID,
    paths: paths,
    expire: expire,
  };
};

/**
 * Attempt to unlock a set of paths.
 * 
 * @param {string} lockID - The lock ID
 * @param {Array<string>} paths - Paths to unlock; pass `null` to unlock all paths for `lockID`
 * @return {PathLockResult} The result of the unlock attempt.
 */
PathLock.prototype.unlock = function({ lockID, paths=null }) {
  const now = new Date();
  for (path of Object.keys(this.locks)) {
    let lock = this.locks[path];
    if (lock.expire <= now) {
      delete this.locks[path];
    } else if (lock.lockID === lockID) {
      if (paths === null || paths.includes(path)) {
        delete this.locks[path];
      }
    }
  }
  return {
    lockID: lockID,
    paths: paths,
    expire: now,
  }
};

/**
 * A shared path lock singleton.
 */
const sharedPathLock = new PathLock();

module.exports.PathLock = PathLock;
module.exports.sharedPathLock = sharedPathLock;