const express = require('express');
const router = express.Router();
const {
  validateParametersMiddleware,
  Validating,
} = require('../modules/validating');
const { handleError } = require('../modules/error');
const Email = require('../modules/email');
const debugConfig = require('../config/debug.config');
const Access = require('../modules/access');
const User = require('../models/user.model');
const Inquiry = require('../models/inquiry.model');
const domainConfig = require('../config/domain.config');

let DemoSignUpParameters = Validating.model({
  type: 'object',
  additionalProperties: false,
  properties: {
    numberOfApps: {
      type: 'string',
      required: false,
    },
    mmps: {
      type: 'array',
      items: {
        type: 'string',
      },
      required: true,
    },
    networks: {
      type: 'array',
      items: {
        type: 'string',
      },
      required: true,
    },
    asoInterest: {
      type: 'string',
      required: false,
    },
    fullName: {
      type: 'string',
      minLength: 1,
      required: true,
    },
    email: {
      type: 'string',
      required: true,
      minLength: 1,
    },
    company: {
      type: 'string',
      required: true,
      minLength: 1,
    },
    role: {
      type: 'string',
      required: false,
    },
  },
}, (instance) => {
  let emailErrors = User.emailValidationErrors(instance.email);
  if (emailErrors.length) { return emailErrors; }
  return [];
});

router.post(
  '/inquiry',
  validateParametersMiddleware(DemoSignUpParameters),
  async (req, res, next) => {
    try {
      req.body.email = req.body.email.toLowerCase();

      let inquiry = new Inquiry(req.body);
      inquiry = await inquiry.save();

    } catch (error) {
      console.error('Failed to save inquiry', error);
    }

    try {
      let mailBody =
`Someone inquired about the ${domainConfig.productName} demo. Here's what they told us:

----------------------------------------------------
Company: ${req.body.company}
Full Name: ${req.body.fullName}
Role: ${req.body.role}
Email: ${req.body.email}
Number of apps: ${req.body.numberOfApps === undefined ? 'unspecified' : req.body.numberOfApps}
MMPs: ${req.body.mmps.join(', ')}
Ad Networks: ${req.body.networks.join(', ')}
Interested in ASO: ${req.body.asoInterest === undefined ? 'unspecified' : req.body.asoInterest}
----------------------------------------------------
`;

      Email.sendEmail(debugConfig.inquiryEmailTo, mailBody, `New ${domainConfig.productName} Demo Inquiry`, [], err => {
        if (err) {
          console.log(err);
        }
      });
      res.json({
        success: true,
        message: 'Successfully signed up for demo.',
        info: req.body,
      });
    } catch (error) {
      return handleError(res, 500, 'Failed to email inquiry.', error);
    }
});

module.exports = router;

