var Code = require('code'),
    Lab = require('lab'),
    lab = exports.lab = Lab.script(),
    describe = lab.experiment,
    before = lab.before,
    after = lab.after,
    it = lab.test,
    expect = Code.expect;

var Facilitator = require('../.');

var redis = require('redis'),
    spawn = require('child_process').spawn,
    client;

var redisProcess;

before(function (done) {
  var redisConfig = '--port ' + 6379;
  redisProcess = spawn('redis-server', [redisConfig]);

  client = redis.createClient(6379, '127.0.0.1');
  done();
});

after(function(done) {
  redisProcess.kill('SIGKILL');
  done();
});

describe('Instantiating a facilitator', function () {
  it('errors out if there is no redis option', function (done) {
    expect(function () {
      var facilitator = new Facilitator();
    }).to.throw('we require a redis instance');
    done();
  });

  it('does not error out if redis is included', function (done) {
    expect(function () {
      var facilitator = new Facilitator({redis: client});
    }).to.not.throw();
    done();
  });
});

describe('generating a token', function () {
  it('sets some data to a randomly generated token', function (done) {
    var data = 'boom';

    var facilitator = new Facilitator({redis: client});
    facilitator.generate(data, function (err, token) {
      expect(err).to.not.exist();
      expect(token).to.exist();

      var key = sha(token);
      client.get(key, function (err, data) {
        data = JSON.parse(data);
        expect(data).to.equal('boom');
        done();
      });
    });
  });

  it('includes the token and hash if the data is an object', function (done) {
    var data = {
      a: 'one',
      b: 'two'
    };

    var facilitator = new Facilitator({redis: client});
    facilitator.generate(data, function (err, token) {
      expect(err).to.not.exist();
      expect(token).to.exist();

      var key = sha(token);
      client.get(key, function (err, data) {
        data = JSON.parse(data);
        expect(data.token).to.exist();
        expect(data.hash).to.exist();
        done();
      });
    });
  });

  it('stringifies the data to be set', function (done) {
    var data = {
      a: 'one',
      b: 'two'
    };

    var facilitator = new Facilitator({redis: client});
    facilitator.generate(data, function (err, token) {
      expect(err).to.not.exist();
      expect(token).to.exist();

      var key = sha(token);
      client.get(key, function (err, data) {
        expect(data).to.be.a.string();
        data = JSON.parse(data);
        expect(data.a).to.equal('one');
        expect(data.b).to.equal('two');
        done();
      });
    });
  });

  it('uses a predefined token if desired', function (done) {
    var data = 'boom';
    var opts = {
      token: '12345'
    };

    var facilitator = new Facilitator({redis: client});
    facilitator.generate(data, opts, function (err, token) {
      expect(err).to.not.exist();

      expect(token).to.equal(opts.token);
      var key = sha(token);
      client.get(key, function (err, data) {
        data = JSON.parse(data);
        expect(data).to.equal('boom');
        done();
      });
    });
  });

  it('adds a prefix to the key if desired', function (done) {
    var data = 'boom';
    var opts = {
      prefix: 'ahoy:'
    };

    var facilitator = new Facilitator({redis: client});
    facilitator.generate(data, opts, function (err, token) {
      expect(err).to.not.exist();

      var key = opts.prefix + sha(token);
      client.get(key, function (err, data) {
        data = JSON.parse(data);
        expect(data).to.equal('boom');
        done();
      });
    });
  });

  it('adds a timeout to the key if desired', function (done) {
    var data = 'boom';
    var opts = {
      timeout: 1
    };

    var facilitator = new Facilitator({redis: client});
    facilitator.generate(data, opts, function (err, token) {
      expect(err).to.not.exist();

      var key = sha(token);
      client.ttl(key, function (err, time) {
        expect(time).to.equal(1);
        client.get(key, function (err, data) {
          data = JSON.parse(data);
          expect(data).to.equal('boom');

          setTimeout(function () {
            client.get(key, function (err, data) {
              data = JSON.parse(data);
              expect(data).to.be.null;
              done();
            });
          }, 1000);
        });
      });
    });
  });
});

var crypto = require('crypto');

function sha (token) {
  return crypto.createHash('sha1').update(token).digest('hex');
}
