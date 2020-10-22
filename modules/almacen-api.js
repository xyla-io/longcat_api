const http = require('http');
const config = require('../config/almacen-api.config');
const querystring = require('querystring');
const Q = require('q');
const LongcatError = require('./error').LongcatError;

module.exports.roles = Object.freeze({
  feeder: 'feeder',
  reader: 'reader',
  tagger: 'tagger',
});

module.exports.entities = Object.freeze({
  campaign: 'campaign',
  adset: 'adset',
  ad: 'ad',
});

const pluralEntity = Object.freeze({
  campaign: 'campaigns',
  adset: 'adsets',
  ad: 'ads',
});

class AlmacenAPIError extends LongcatError {
  constructor(body, code) {
    if (typeof body === 'object' && body.message !== undefined) {
      super(body.message, code);
    } else {
      super('An upstream error occurred.', code);
    }
    this.info.upstreamCode = code;
  }
}
module.exports.AlmacenAPIError = AlmacenAPIError;

module.exports.request = function(props, callback) {
  let path;
  if (props.parameters && Object.keys(props.parameters).length > 0) {
    path = `${props.endpoint}?${querystring.stringify(props.parameters)}`
  } else {
    path = props.endpoint;
  }

  let headers = {
    Authorization: `Bearer ${props.token}`,
  };

  if (props.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(props.body);
  }

  let request = http.request({
    protocol: config.protocol,
    host: config.host,
    port: config.port,
    method: props.method,
    path: path,
    headers: headers,
  }, response => callback(null, response));
  request.on('error', callback);

  if (props.body !== undefined) {
    request.write(Buffer.from(props.body));
  }
  request.end();
  return request;
}

function ResponseParser(rejectErrors) {
  this.rejectErrors = !!rejectErrors;
  this.deferred = Q.defer();
}
ResponseParser.prototype.callback = function() {
  let self = this;
  return (error, response) => {
    if (error) { return self.deferred.reject(error); }
    let responseData = '';
    response.on('data', data => { 
      responseData += data; });
    response.on('end', () => {
      let body = responseData;
      if (response.headers['content-type'] && response.headers['content-type'].includes('application/json')) {
        try {
          body = JSON.parse(body);
        } catch (error) {
          return self.deferred.reject(error);
        }
      }
      if (self.rejectErrors && response.statusCode !== 200) {
        return self.deferred.reject(new AlmacenAPIError(body, response.statusCode));
      }
      self.deferred.resolve({
        statusCode: response.statusCode,
        body: body,
      });
    });
  }
}
Object.defineProperty(ResponseParser.prototype, 'promise', {
  get() { return this.deferred.promise; }
});

module.exports.forwardRequest = function(path, req, role, callback) {
  let headers = Object.assign({}, req.headers, {
    Authorization: `Bearer ${config.tokens[module.exports.roles[role]]}`
  });
  const isMultiPartForm = (req.get('content-type') || '').startsWith('multipart/form-data');
  if (isMultiPartForm) {
    let request = http.request({
      protocol: config.protocol,
      host: config.host,
      port: config.port,
      method: req.method,
      path: path,
      headers: headers,
    }, response => callback(null, response));
    request.on('error', callback);
    req.pipe(request);
    return request;
  }

  const bodyString = req.body ? JSON.stringify(req.body) : undefined;
  const doesHavePayload = Object.keys(req.body).length;
  if (doesHavePayload) {
    Object.keys(headers).forEach(k => { 
      if (['content-type', 'content-length'].includes(k.toLowerCase())) {
        delete headers[k];
      }
    });
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(bodyString);
  }
  let request = http.request({
    protocol: config.protocol,
    host: config.host,
    port: config.port,
    method: req.method,
    path: path,
    headers: headers,
  }, response => callback(null, response));
  request.on('error', callback);
  if (doesHavePayload) {
    request.write(Buffer.from(bodyString));
  }
  request.end();
  return request;
};

module.exports.forwardAndParse = function(path, req, role, rejectErrors) {
  let parser = new ResponseParser(rejectErrors);
  this.forwardRequest(path, req, role, parser.callback());
  return parser.promise;
};

module.exports.forwardAndParseOriginalUrl = function({ req, role = this.roles.tagger}) {
  return this.forwardAndParse(req.originalUrl.replace('api/', ''), req, role, true);
}

module.exports.get = function(props, callback) {
  return this.request({
    method: 'GET',
    token: props.token,
    endpoint: props.endpoint,
    parameters: props.parameters,
    body: undefined,
  }, callback);
};

module.exports.post = function(props, callback) {
  return this.request({
    method: 'POST',
    token: props.token,
    endpoint: props.endpoint,
    parameters: props.parameters || {},
    body: props.body
  }, callback);
};

module.exports.put = function(props, callback) {
  return this.request({
    method: 'PUT',
    token: props.token,
    endpoint: props.endpoint,
    parameters: props.parameters || {},
    body: props.body
  }, callback);
};

module.exports.patch = function(props, callback) {
  return this.request({
    method: 'PATCH',
    token: props.token,
    endpoint: props.endpoint,
    parameters: props.parameters || {},
    body: props.body
  }, callback);
};

module.exports.delete = function(props, callback) {
  return this.request({
    method: 'DELETE',
    token: props.token,
    endpoint: props.endpoint,
    parameters: props.parameters || {},
    body: undefined
  }, callback);
};

module.exports.getTagsForCompanyEntity = function(req, companyIdentifier, entity) {
  return this.forwardAndParse(`/companies/${encodeURIComponent(companyIdentifier)}/entities/${pluralEntity[entity]}`, req, this.roles.tagger, true);
};

module.exports.updatePrimaryTagsForCompanyEntity = function(req, companyIdentifier, entity) {
  let parser = new ResponseParser(true);
  this.patch({
    endpoint: `/companies/${encodeURIComponent(companyIdentifier)}/entities/${pluralEntity[entity]}/tags/primary`,
    token: config.tokens.tagger,
    body: JSON.stringify(req.body),
  }, parser.callback());
  return parser.promise;
};

module.exports.updateSubtagsForCompanyEntity = function(req, companyIdentifier, entity) {
  let parser = new ResponseParser(true);
  this.patch({
    endpoint: `/companies/${encodeURIComponent(companyIdentifier)}/entities/${pluralEntity[entity]}/tags/subtag`,
    token: config.tokens.tagger,
    body: JSON.stringify(req.body),
  }, parser.callback());
  return parser.promise;
};

module.exports.deleteTagsForCompanyEntity = function(req, companyIdentifier, entity) {
  let parser = new ResponseParser(true);
  this.patch({
    endpoint: `/companies/${encodeURIComponent(companyIdentifier)}/entities/${pluralEntity[entity]}/tags/delete`,
    token: config.tokens.tagger,
    body: JSON.stringify(req.body),
  }, parser.callback());
  return parser.promise;
};

module.exports.mergeCSVTags = function(req, companyIdentifier, entity) {
  return this.forwardAndParse(`/companies/${encodeURIComponent(companyIdentifier)}/entities/${pluralEntity[entity]}/tags/csv/merge`, req, this.roles.tagger, true);
};

module.exports.applyTagsToCube = function(req, companyIdentifier, entity) {
  let parser = new ResponseParser(true);
  return this.patch({
    endpoint: `/companies/${encodeURIComponent(companyIdentifier)}/entities/${pluralEntity[entity]}/tags/update/cube`,
    token: config.tokens.tagger,
  }, parser.callback());
  return parser.promise;
};

module.exports.postQueryForCompany = function(companyIdentifier, query, rejectErrors) {
  let parser = new ResponseParser(rejectErrors);
  this.post({
    endpoint: `/companies/${encodeURIComponent(companyIdentifier)}/query/run`,
    token: config.tokens.reader,
    body: JSON.stringify({query: query}),
  }, parser.callback());
  return parser.promise;
};

module.exports.createFeedTable = function(companyIdentifier, tableName, columnTypes) {
  let parser = new ResponseParser(true);
  this.put({
    endpoint: `/companies/${encodeURIComponent(companyIdentifier)}/feeds/tables/${encodeURIComponent(tableName)}`,
    token: config.tokens.feeder,
    body: JSON.stringify({
      column_types: columnTypes,
      read_only_groups: [ 'all_client_readers' ],
    }),
  }, parser.callback());
  return parser.promise;
};

module.exports.determineFeedColumnTypes = function(req, companyIdentifier) {
  return this.forwardAndParse(`/companies/${encodeURIComponent(companyIdentifier)}/feeds/utils/structure/csv`, req, this.roles.feeder, true);
};

module.exports.replaceFeedTableData = function(req, companyIdentifier, tableName) {
  return this.forwardAndParse(`/companies/${encodeURIComponent(companyIdentifier)}/feeds/tables/${tableName}/replace`, req, this.roles.feeder, true);
};

module.exports.mergeFeedTableData = function(req, companyIdentifier, tableName) {
  return this.forwardAndParse(`/companies/${encodeURIComponent(companyIdentifier)}/feeds/tables/${tableName}/merge`, req, this.roles.feeder, true);
};

module.exports.deleteFeedTable = function(req, companyIdentifier, tableName) {
  return this.forwardAndParse(`/companies/${encodeURIComponent(companyIdentifier)}/feeds/tables/${tableName}`, req, this.roles.feeder, true);
};

Object.freeze(module.exports);
