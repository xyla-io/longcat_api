const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Sanitizing = require('../modules/sanitizing');
const Token = require('../modules/token');
const {
  NotFoundError,
} = require('../modules/error');

const InquirySchema = Schema({
  email: {
    type: String,
    required: 'Please provide an email',
  },
  company: {
    type: String,
    required: 'Please provide a company',
  },
  role: {
    type: String,
  },
  asoInterest: {
    type: String,
    default: null,
  },
  fullName: {
    type: String,
    required: 'Please provide a first name',
  },
  mmps: {
    type: [String],
    default: [],
  },
  networks: {
    type: [String],
    default: [],
  },
  numberOfApps: {
    type: String,
    default: null,
  },
});


let Inquiry = mongoose.model('Inquiry', InquirySchema);

module.exports = Inquiry;
