const Q = require('q');
const fs = require('fs');
const exec = require('child_process').exec;

const rootDirectory = require('path').dirname(require.main.filename);
const filesDirectory = `${rootDirectory}/files`;

const dirPaths = Object.freeze({
  companies: `${filesDirectory}/companies`,
  users: `${filesDirectory}/users`,
  ui: `${filesDirectory}/ui`,
});

const pathBuilder = Object.freeze({
  company: (companyID) => {
    return `${dirPaths.companies}/${companyID}`;
  },
  user: (userID) => {
    return `${dirPaths.users}/${userID}`;
  },
});

function mkdirp(path) {
  let deferred = Q.defer();
  fs.access(path, err => {
    if (err) { 
      // Path does not already exist
      fs.mkdir(path, {recursive: true}, err => {
        if (err) { return deferred.reject(err.code); }
        return deferred.resolve();
      });
    } else {
      // Path already exists
      return deferred.resolve();
    }
  });
  return deferred.promise;
}

function deleteFile(path) {
  let deferred = Q.defer();
  fs.unlink(path, err => {
    if (err) { return deferred.reject(err); }
    return deferred.resolve();
  });
  return deferred.promise;
}

function removeDirectoryRecursively(path) {
  let deferred = Q.defer();
  if (!path) { deferred.reject('no path found'); }
  exec(`rm -r ${path}`, (error, stdout, stderr) => {
    if (error) { return deferred.reject(error); }
    return deferred.resolve(stdout);
  });
  return deferred.promise;
}

module.exports = {
  dirPaths,
  pathBuilder,
  mkdirp,
  deleteFile,
  removeDirectoryRecursively,
};
