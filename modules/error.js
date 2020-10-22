function handleError(res, code, message, err) {
  if (err instanceof LongcatError) {
    return err.send(res, err.code || code, { handlerCode: code, handlerMessage: message });
  }

  if (message === undefined) {
    message = 'An error occurred.';
  }
  if (err) {
    console.log(err);
    message += ` Error: ${err}`;
  }
  res.status(code).json({
    success: false,
    message: message,
  });
}

function handleValidationErrors(res, errors) {
  handleError(res, 400, 'Invalid parameters.\n\n' + errors.join('\n'));
}

function handlePermissionError(res, error) {
  handleError(res, 403, 'Permission denied.', error);
}

class LongcatError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'LongcatError';
    this.info = {};
    this.code = code;
  }
  send(res, code, info) {
    Object.assign(this.info, info);
    res.status(code || this.code).json({
      success: false,
      message: this.message,
      info: this.info
    });
  }
  setKey(key) { this.info.key = key; }
  setValue(value) { this.info.value = value; }
}

class BadRequestError extends LongcatError {
  constructor(message) {
    super(message, 400)
    this.name = 'BadRequestError';
    this.info = {
      type: this.name,
    }
  }
}


class NotFoundError extends LongcatError {
  constructor(key, value) {
    super('No entity found for key.', 404);
    this.name = 'NotFoundError';
    this.info = {
      type: this.name,
      key: key,
      value: value
    }
  }
}

class DuplicateKeyError extends LongcatError {
  constructor(key, value) {
    super('Key already exists and must be unique.', 409);
    this.name = 'DuplicateKeyError';
    this.info = {
      type: this.name,
      key: key,
      value: value,
    }
  }
}

class InvalidContentError extends LongcatError {
  constructor(errors) {
    super('Property "content" is invalid.');
    this.name = 'InvalidContentError';
    this.info = {
      type: this.name,
      errors: errors,
    }
  }
}

class ForbiddenError extends LongcatError {
  constructor() {
    super('Permission denied', 403);
    this.name = 'ForbiddenError';
    this.info = {
      type: this.name,
    };
  }
};

class InternalServerError extends LongcatError {
  constructor(message) {
    super('Internal server error' + message ? (': ' + message): '', 500);
    this.name = 'InternalServerError';
  }
};

const mapMongoError = function(mongoError) {
  if (!mongoError) { return new Error(); }
  switch(mongoError.code) {
    case 11000: return new DuplicateKeyError();
  }
  return mongoError;
};

class QueryCompositionError extends LongcatError {
  constructor(message) {
    super('QueryCompositionError' + message ? (': ' + message): '', 500);
    this.name = 'QueryCompositionError';
  }
};

class TemplateAssemblyError extends LongcatError {
  constructor(message) {
    super('TemplateAssemblyError' + message ? (': ' + message): '', 500);
    this.name = 'TemplateAssemblyError';
  }
};

module.exports = {
  handleError,
  handleValidationErrors,
  handlePermissionError,

  LongcatError,
  BadRequestError,
  NotFoundError,
  DuplicateKeyError,
  InvalidContentError,
  ForbiddenError,
  InternalServerError,
  QueryCompositionError,
  TemplateAssemblyError,

  mapMongoError,
};
