const environmentFile = process.argv[6] || 'development';
const environment = require('../environment/' + environmentFile);

/**
 * Recursively traverse object and overwrite `defaultConfig` at any path that is also defined in environmentConfig`
 * @param {object} defaultConfig the default config object or sub-object
 * @param {object} environmentConfig the environment object or sub-object that will override
 *
 * @return {object} the overriden config object or sub-object
 */
function traverseAndReplace(defaultConfig, environmentConfig, configKey, parentPath) {
  Object.keys(environmentConfig).forEach(key => {
    if (typeof environmentConfig[key] === 'object') {
      defaultConfig[key] = traverseAndReplace(defaultConfig[key], environmentConfig[key], configKey, parentPath + '.' + key);
    } else {
      if (!Object.keys(defaultConfig).includes(key)) {
        throw new Error(`Environment file for ${environmentFile} includes a key (${parentPath}.${key}) that doesn't exist in the config file for ${configKey}`);
      }
      defaultConfig[key] = environmentConfig[key];
    }
  });
  return defaultConfig;
}

/**
 * Override a configs values with any config paths defined in the environment file
 *
 * @param {string} configKey name of the configuration that matches a top-level key in the environment file (if it exists)
 * @param {string} config default values of the config before being overridden by the environment file
 *
 * @return {object} the configuration with environment overrides applied
 */
module.exports = function(configKey, config) {
  let environmentConfig = environment[configKey];
  if (!environmentConfig) { return config; }
  let overriddenConfig = traverseAndReplace(config, environmentConfig, configKey, '');
  return overriddenConfig;
}
