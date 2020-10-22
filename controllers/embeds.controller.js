const express = require('express');
const router = express.Router();
const acl = new(require('../modules/acl'))();
const Access = require('../modules/access');
const EmbedValidation = require('./validation/embeds.validation');
const Report = require('../models/report.model');
const SQLQuery = require('../models/sql-query.model.js');
const AlmacenAPI = require('../modules/almacen-api');
const s3 = require('../modules/s3');
const Q = require('q');
const {
  handleError,
  handleValidationErrors,
  BadRequestError,
  ForbiddenError,
} = require('../modules/error');

const modeanalyticsConfig = require('../config/modeanalytics');
const periscopedataConfig = require('../config/periscopedata');
const datadragonConfig = require('../config/datadragon');
const crypto = require('crypto');
const stableStringify = require('json-stable-stringify');

acl.allow([{
  roles: [acl.roles.user],
  allows: [
    { resources: ['/sign'], permissions: ['post'] },
  ]
}, {
  roles: [acl.userRoles.super],
  allows: [
  ]
}]);

let signEmbedRequest = {
  periscope: async function(uid, embed, user) {
    return Q.fcall(() => {
      let embedData = {
        dashboard: embed.dashboardID,
        embed: 'v2',
        data_ts: ((new Date()).getTime() / 1000)  - (60 * 10),
      };
      Object.assign(embedData, embed.params); 
      if (embed.chartID) { embedData.chart = embed.chartID; }

      const encodedEmbedData = encodeURIComponent(JSON.stringify(embedData)).replace(/'/g, '%27');
      const domain = periscopedataConfig.domain;
      const path = `/api/embedded_dashboard?data=${encodedEmbedData}`;
      const signature = crypto.createHmac('sha256', periscopedataConfig.apiKey).update(path).digest('hex');
      const signedURL = `${domain}${path}&signature=${signature}`;
      return {
        embedType: 'periscope',
        uid: uid,
        signedURL: signedURL,
      };
    });
  },
  mode: async function(uid, embed, user) {
    return Q.fcall(() => {
      let timestamp = Math.floor(Date.now() / 1000);
      let queryURL = `${embed.url}?access_key=${modeanalyticsConfig.accessKey}&max_age=${modeanalyticsConfig.maxReportAge}&timestamp=${timestamp}`;
      let requestString = `GET,,1B2M2Y8AsgTpgAmY7PhCfg==,${queryURL},${timestamp}`;
      let signature = crypto.createHmac('sha256', modeanalyticsConfig.accessSecret).update(requestString).digest('hex');

      let signedURL = `${queryURL}&signature=${signature}`;
      return {
        embedType: 'mode',
        uid: uid,
        signedURL: signedURL,
      };
    });
  },
  xyla: async function(uid, embed, user) {
    return Q.fcall(async () => {
      const embedPermissionError = Access.userPermissionError(user, embed.path, Access.actions.embed);
      if (embedPermissionError) {
        throw new ForbiddenError();
      }
      let pathComponents = Access.componentsFromPath(embed.path);
      let deferredResponse = {
        embedType: 'xyla',
        uid: uid
      };
      if (pathComponents.length < 2 || pathComponents[0] !== 'companies') {
        throw new BadRequestError(`Invalid embed path (${embed.path})`);
      }
      const companyIdentifier = pathComponents[1];

      // TODO: add proper support for global access through the access module
      if (!embed.queryPath.match(/^global_queries_[^_]+$/)) {
        const queryPermissionError = Access.userPermissionError(user, embed.queryPath, Access.actions.use);
        if (queryPermissionError) {
          throw new ForbiddenError();
        }
      }
      const query = await SQLQuery.getByPath(embed.queryPath);
      if (query === null) {
        throw new Error(`Embed queryPath not found (${embed.queryPath})`);
      }

      const result = await AlmacenAPI.postQueryForCompany(companyIdentifier, query.compose({
        schema: companyIdentifier,
        parameters: embed.queryParameters || {},
      }));
      switch (result.statusCode) {
      case 200:
        return (Object.assign(deferredResponse, {
          signedURL: s3.getSignedUrl(result.body.s3_bucket, result.body.results_path),
        }));
      default:
        throw new Error(result.body.message);
      }
    });
  },
  datadragon: async function(uid, embed, user) {
    const { companies: accessibleCompanies, roles } = user;
    const { companyIdentifier, apiOnly } = embed;
    if (!roles.includes('super')) {
      throw new ForbiddenError();
    }
    // Note: we can use user.companies without checking further permissions because we only allow
    // super users to perform this action for now
    // TODO: should create `manage_company_rules` permission or something similar as this feature matures
    if (!accessibleCompanies.map(co => co.identifier).includes(companyIdentifier)) {
      throw new ForbiddenError();
    }
    return Q.fcall(() => {
      const { apiKey, protocol } = datadragonConfig;
      const host = apiOnly ? datadragonConfig.apiHost : datadragonConfig.uxHost;
      const port = apiOnly ? datadragonConfig.apiPort : datadragonConfig.uxPort;
      const domain = `${protocol ? protocol + '//' : ''}${host}${port ? ':' + port : ''}${apiOnly ? '/api' : ''}`;
      const embedData = {
        email: `datadragon.${companyIdentifier}@AGENCYHOSTNAME`,
        clientId: 'longcat',
        timestamp: Date.now(),
        domain,
      };
      const encodedEmbedData = encodeURIComponent(JSON.stringify(embedData));
      const path = `/sso?data=${encodedEmbedData}`;
      const unsignedURL = `${domain}${path}`;
      const signature = crypto.createHmac('sha256', apiKey).update(unsignedURL).digest('hex');
      const signedURL = `${unsignedURL}&signature=${signature}`;
      return {
        embedType: 'datadragon',
        uid: uid,
        signedURL,
        apiOnly: !!apiOnly,
      };
    });
  },
};

let validateEmbedRequest = {
  periscope: function(existingEmbed, requestedEmbed) {
    if (existingEmbed.dashboardID !== requestedEmbed.dashboardID) {
      throw new Error(`Requested periscope embed dashboard ID (${requestedEmbed.dashboardID}) does not match existing (${existingEmbed.dashboardID}) for path ${existingEmbed.path}`);
    }
    if (existingEmbed.chartID !== requestedEmbed.chartID) {
      throw new Error(`Requested periscope embed dashboard ID (${requestedEmbed.dashboardID}) does not match existing (${existingEmbed.dashboardID}) for path ${existingEmbed.path}`);
    }
    let requestedFiltersByName = {};
    requestedEmbed.params.filters.forEach(filter => {
      if (requestedFiltersByName[filter.name] !== undefined) {
        throw new Error(`Requested periscope embed must not contain duplicate filter names (${filter.name}) for path ${existingEmbed.path}`);
      }
      requestedFiltersByName[filter.name] = filter;
    });
    existingEmbed.params.filters.forEach(filter => {
      if (requestedFiltersByName[filter.name] === undefined) {
        throw new Error(`Requested periscope embed must contain filter with name ${filter.name} for path ${existingEmbed.path}`);
      }
      if (stableStringify(requestedFiltersByName[filter.name].value) !== stableStringify(filter.value)) {
        throw new Error(`Requested periscope embed filter with name ${filter.name} value ${requestedFiltersByName[filter.name].value} does not match ${filter.value} for path ${existingEmbed.path}`);
      }
      if (requestedFiltersByName[filter.name].group !== filter.group) {
        throw new Error(`Requested periscope embed filter with name ${filter.name} group ${requestedFiltersByName[filter.name].group} does not match ${filter.group} for path ${existingEmbed.path}`);
      }
    });
    requestedEmbed.params.visible.forEach(name => {
      if (!existingEmbed.params.visible.includes(name)) {
        throw new Error(`Requested periscope embed visible ${name} is not allowed for path ${existingEmbed.path}`);
      }
    });
    ['daterange', 'aggregation'].forEach(filterName => {
      if (requestedEmbed.params[filterName] !== undefined || existingEmbed.params[filterName] !== undefined) {
        if (stableStringify(requestedEmbed.params[filterName]) !== stableStringify(existingEmbed.params[filterName])) {
          throw new Error(`Requested periscope embed ${filterName} value ${requestedEmbed.params[filterName]} does not match ${existingEmbed.params[filterName]} for path ${existingEmbed.path}`);
        }
      }  
    });
  },
  mode: function(existingEmbed, requestedEmbed) {
    if (existingEmbed.url !== requestedEmbed.url) {
      throw new Error(`Requested mode embed URL (${requestedEmbed.url}) does not match existing (${existingEmbed.url}) for path ${existingEmbed.path}`);
    }
  },
  xyla: function(existingEmbed, requestedEmbed) {
    // TODO: add proper support for global access through the access module
    if (requestedEmbed.queryPath.match(/^global_queries_[^_]+$/)) {
      return;
    }
    if (existingEmbed.queryPath !== requestedEmbed.queryPath) {
      throw new Error(`Requested xyla embed queryPath (${requestedEmbed.queryPath}) does not match existing (${existingEmbed.queryPath}) for path ${existingEmbed.path}`);
    }
  },
  datadragon: function(existingEmbed, requestedEmbed) {},
};

/**
 * @api {post} /embeds/sign Retrieve signed embed URL for embeddable content
 * @apiName PostEmbed
 * @apiGroup Embed
 */
router.post('/sign', acl.middleware(), async (req, res) => {
  let parameters = EmbedValidation.Signing(req.body);
  let validationErrors = parameters.validationErrors();
  if (validationErrors) { return handleValidationErrors(res, validationErrors); }

  const skipEmbedAuthorizationForKeys = ['xyla', 'datadragon'];
  const embedPathsToAuthorize = Object.keys(parameters).reduce((paths, embedType) => {
    for (let uid in parameters[embedType]) {
      if (!skipEmbedAuthorizationForKeys.includes(embedType)) {
        paths.push(parameters[embedType][uid].path);
      }
    }
    return paths;
  }, []);
  let permissionErrors = embedPathsToAuthorize
    .map(path => Access.userPermissionError(req.user, path, Access.actions.embed))
    .filter(error => error !== null);
  if (permissionErrors.length) {
    return handleError(res, 403, 'Permission denied\n\n' + permissionErrors.join('\n'));
  }
  try {
    let existingEmbeds = await Report.getEmbeds(embedPathsToAuthorize);
    let response = {};
    let signingPromises = [];
    let signingResponse = [];
    let existingEmbedsByPath = {};
    existingEmbeds.forEach(embed => existingEmbedsByPath[embed.path] = embed);

    Object.keys(parameters).forEach(embedType => {
      response[embedType] = {};
      for (let uid in parameters[embedType]) {
        let requestedEmbed = parameters[embedType][uid];
        validateEmbedRequest[embedType](existingEmbedsByPath[requestedEmbed.path], requestedEmbed);
        let responseEmbed = Object.assign({}, requestedEmbed);
        signingPromises.push(signEmbedRequest[embedType](uid, responseEmbed, req.user));
        signingResponse.push(responseEmbed);
        response[embedType][uid] = responseEmbed;
      }
    });

    let results = await Q.allSettled(signingPromises);
    results.forEach((result, i) => {
      Object.assign(signingResponse[i], {
        success: result.state === 'fulfilled',
        message: result.reason ? result.reason.message : 'Signed embed successfully.',
        signedURL: result.value ? result.value.signedURL : null,
      });
    });
    res.json({
      success: true,
      message: 'Signed embeds successfully.',
      embeds: response,
    });
  } catch (error) {
    return handleError(res, 500, 'Failed to sign embeds', error);
  }
});

module.exports = router;
