module.exports.union = function(a, b) {
  return new Set([...a, ...b]);
}

module.exports.intersection = function(a, b) {
  return new Set([...a].filter(x => b.has(x)));
}

module.exports.difference = function(a, b) {
  return new Set([...a].filter(x => !b.has(x)));
}
