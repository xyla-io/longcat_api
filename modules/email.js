const nodemailer = require('nodemailer');
const path = require('path');
const config = require(path.dirname(require.main.filename) + '/config/email.config.js');
const domainConfig = require('../config/environment')('domain');

module.exports.getLongcatUXBaseURL = (subdomain) => {
  if (subdomain && subdomain.length) {
    return `https://${subdomain}.${domainConfig.name}`;
  } else {
    return 'http://localhost:4200';
  }
};

module.exports.sendHTMLEmail  = (emailAddressList, emailHTML, subjectTitle, attachments, completion) => {
  var mailOptions = {
    to: emailAddressList,
    from: config.from,
    subject: subjectTitle,
    html: emailHTML,
    attachments: attachments
  };

  transport.sendMail(mailOptions, completion);
};

module.exports.sendEmail = (emailAddressList, emailText, subjectTitle, attachments, completion) => {
  var mailOptions = {
    to: emailAddressList,
    from: config.from,
    subject: subjectTitle,
    text: emailText,
    attachments: attachments
  };

  transport.sendMail(mailOptions, completion);
};

const transport = nodemailer.createTransport(config.transportOptions);
