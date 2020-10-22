const { Validating } = require('../../modules/validating');
const { genericTemplateSchema } = require('./schemas/common-template.schema');
const { MasterTemplateValidator } = require('./master-template.validation');
const { DeckTemplateValidator } = require('./deck-template.validation');
const { GroupTemplateValidator } = require('./group-template.validation');
const { BigNumberTemplateValidator } = require('./big-number-template.validation');
const { BreakdownTableTemplateValidator } = require('./breakdown-table-template.validation');

const GenericTemplateValidator = Validating.model(genericTemplateSchema);

function templateValidationModel(instance) {
  if (typeof instance !== 'object' || !instance.metadata || typeof instance.metadata.templateType !== 'string') {
    GenericTemplateValidator;
  }
  switch (instance.metadata.templateType) {
    case 'master': return MasterTemplateValidator;
    case 'deck': return DeckTemplateValidator;
    case 'group': return GroupTemplateValidator;
    case 'big_number': return BigNumberTemplateValidator;
    case 'breakdown_table': return BreakdownTableTemplateValidator;
    default: return GenericTemplateValidator;
  }
}

module.exports.GenericTemplateValidator = GenericTemplateValidator;
module.exports.templateValidationModel = templateValidationModel;