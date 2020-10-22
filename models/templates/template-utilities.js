/**
 * Filter a template
 * 
 * @param {object} template - The template to modify
 * @param {boolean} metadata - Wheter to include template metadata
 * @param {boolean} parameters - Whether to include non-metadata template parameters
 * @return {object} A new, filtered template object.
 */
function filteredTemplate({template, metadata=true, parameters=true}) {
  let filtered = (parameters) ? Object.assign({}, template) : { metadata: template.metadata };
  if (!metadata) {
    delete filtered.metadata;
  }
  return filtered;
}

module.exports.filteredTemplate = filteredTemplate;
