var assert = require('assert'),
    crypto = require('crypto'),
    VError = require('verror'),
    _ = require('lodash');

var Facilitator = module.exports = function (opts) {
  _.extend(this, {}, opts);

  assert(this.redis, 'we require a redis instance');

  if (!this.logger) {
    this.logger = {
      error: console.error,
      info: console.log
    };
  }

  return this;
};

Facilitator.prototype.generate = function (data, options, cb) {
  var _this = this;

  if (typeof options === 'function') {
    cb = options;
    options = null;
  }

  var token = options && options.token ||
              crypto.randomBytes(30).toString('base64')
                .split('/').join('_')
                .split('+').join('-'),
      hash = sha(token),
      key = (options && options.prefix || '') + hash;

  data.token = token + '';
  data.hash = hash + '';

  this.redis.set(key, JSON.stringify(data), function (err) {

    if (err) {
      err = new VError(err, "Unable to set '%s' to the cache", key);
      _this.logger.error(err);
      return cb(err);
    }

    if (options && options.timeout) {
      _this.redis.expire(key, options.timeout);
    }

    return cb(null, token);
  });
};

Facilitator.prototype.read = function (token, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = null;
  }

  var logger = this.logger;

  var key = (options && options.prefix || '') + sha(token);

  this.redis.get(key, function (err, data) {
    if (err) {
      err = new VError(err, "Unable to get '%s' from cache", key);
      logger.error(err);
      return cb(err);
    }

    try {
      data = JSON.parse(data);
    } catch (e) {
      err = new VError(e, "Error parsing data from %s", key);
      logger.error(err);
      return cb(err);
    }

    cb(null, data);
  });
};

function sha (token) {
  return crypto.createHash('sha1').update(token).digest('hex');
}
