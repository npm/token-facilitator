var assert = require('assert'),
    crypto = require('crypto'),
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

  var token = crypto.randomBytes(30).toString('base64')
            .split('/').join('_')
            .split('+').join('-'),
      hash = sha(token),
      key = (options && options.prefix || '') + hash;

  data.token = token + '';

  this.redis.set(key, JSON.stringify(data), function (err) {

    if (err) {
      _this.logger.error('Unable to set ' + key + ' to the cache');
      _this.logger.error(err);
      return cb(err);
    }

    if (options && options.timeout) {
      _this.redis.expire(key, options.timeout);
    }

    return cb(null, token);
  });
};

function sha (token) {
  return crypto.createHash('sha1').update(token).digest('hex');
}
