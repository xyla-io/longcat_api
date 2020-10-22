const mongoose = require('mongoose');
const Sanitizing = require('../../modules/sanitizing');

const TemplateMetadataSchema = mongoose.Schema({
  templateType: {
    type: String,
    required: 'Please provide a template type',
  },
  identifier: {
    type: String,
    required: 'Please provide a template identifier',
  },
  version: {
    type: Number,
    default: 0,
  },
  parentPath: {
    type: String,
    required: 'Please provide a parent path',
  },
  parentVersion: {
    type: Number,
    default: 0,
  },
  more: {
    type: Object,
    default: {},
  },
}, { minimize: false, strict: false });

Sanitizing.addToSchema(TemplateMetadataSchema, ['exposableProperties']);
TemplateMetadataSchema.virtual('exposableProperties').get(function() {
  return [
    'templateType',
    'identifier',
    'version',
    'parentPath',
    'parentVersion',
    'more',
  ];
});

module.exports.TemplateMetadataSchema = TemplateMetadataSchema;
