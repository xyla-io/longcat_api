const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Sanitizing = require('../modules/sanitizing');
const Token = require('../modules/token');
const {
  NotFoundError,
} = require('../modules/error');

const InvitationSchema = Schema({
  email: {
    type: String,
    required: 'Please provide an email',
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: 'Please provide a company',
  },
  token: {
    type: String,
    required: 'Please provide an invitation token',
  },
  invitationDate: {
    type: Date,
    default: Date.now,
  },
});

InvitationSchema.index({ email: 1, company: 1 }, { unique: true });

Sanitizing.addToSchema(InvitationSchema, ['exposableProperties']);
InvitationSchema.virtual('exposableProperties').get(function() {
  return [
    'email',
    'invitationDate',
    'token',
  ];
});

let Invitation = mongoose.model('Invitation', InvitationSchema);

Invitation.fromCompanyAndEmail = async function(companyID, email) {
  const invitation = new Invitation({
    email: email,
    company: companyID,
  });
  invitation.token = await Token.generateToken(64);
  return invitation;
};

Invitation.getByCompanyAndEmail = async function(company, email) {
  return await Invitation.findOne({
      email: email.toLowerCase(),
      company: company,
    }).populate('company');
};

Invitation.getByToken = async function(token) {
  return await Invitation.findOne({
    token: token,
  });
};

Invitation.getAllByCompanyID = function(companyID) {
  return Invitation.find({ 'company': companyID });
};

module.exports = Invitation;
