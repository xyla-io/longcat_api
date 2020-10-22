function recordOfTemplates(templates) {
  return templates.reduce((record, template) => {
    record[template.metadata.identifier] = template;
  }, {});
}

function setOfTemplateIdentifiers(templates) {
  return templates.reduce((set, template) => {
    set.add(template.metadata.identifier);
  }, new Set());
}

function deduplicateTemplatesByIdentifier(primaryTemplates, secondaryTemplates) {
  const primaryTemplateIdentifiers = setOfTemplateIdentifiers(primaryTemplates)
  return [].concat(primaryTemplates, secondaryTemplates.filter(template => {
    return !primaryTemplateIdentifiers.has(template.metadata.identifier);
  }));
}

module.exports.deduplicateTemplatesByIdentifier = deduplicateTemplatesByIdentifier;