const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Sanitizing = require('../../modules/sanitizing');

const SchedulableSchema = Schema({
  hour: {
    type: 'number',
    required: 'Please provide the hour on the day in 0-23 format',
  },
  minute: {
    type: 'number',
    required: 'Please provide the minutes on the hour',
  },
});

Sanitizing.addToSchema(SchedulableSchema, ['exposableProperties']);
SchedulableSchema.virtual('exposableProperties').get(function() {
  return [
    'hour',
    'minute',
  ];
});

module.exports.SchedulableSchema = SchedulableSchema;
