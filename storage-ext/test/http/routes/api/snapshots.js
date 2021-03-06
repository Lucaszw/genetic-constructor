"use strict";

var assert = require("assert");
var async = require("async");
var request = require("supertest");
var describeAppTest = require("../../../api-app");

var each = require('underscore').each;
var keys = require('underscore').keys;
var map = require('underscore').map;
var pick = require('underscore').pick;
var omit = require('underscore').omit;
var uniq = require('underscore').uniq;

var Project = require('../../../../lib/project');
var Snapshot = require('../../../../lib/snapshot');

var owner = '810ffb30-1938-11e6-a132-dd99bc746800';

describeAppTest("http", function (app) {
  describe('api snapshot routes', function () {
    this.timeout(15000);

    var projectId = 'project-fe5b5340-8991-11e6-b86a-b5fa2a5eb9ca';

    var projectUUID0 = null;
    var projectUUID1 = null;

    var snapshotUUID0 = null;
    var snapshotUUID1 = null;

    before(function (done) {
      async.series([
        function (cb) {
          request(app.proxy)
            .post('/api/projects')
            .send({
              owner: owner,
              id: projectId,
              data: {
                foo: "bar",
                yes: "no",
                counts: {
                  "1": 10,
                  "2": 47,
                },
              },
            })
            .expect(200)
            .end(function (err, res) {
              assert.ifError(err);
              assert.notEqual(res, null);
              assert.notEqual(res.body, null);
              assert.notEqual(res.body.uuid, null);
              projectUUID0 = res.body.uuid;
              return cb(err);
            });
        },
        function (cb) {
          request(app.proxy)
            .post('/api/projects/' + projectId)
            .send({
              data: {
                foo: "bar",
                yes: "no",
                counts: {
                  "1": 10,
                  "2": 47,
                  "3": 578,
                },
                what: "happened",
              },
            })
            .expect(200)
            .end(function (err, res) {
              assert.ifError(err);
              assert.notEqual(res, null);
              assert.notEqual(res.body, null);
              assert.notEqual(res.body.uuid, projectUUID0);
              assert.equal(res.body.version, 1);
              return cb(err);
            });
        },
      ], function (err) {
        assert.ifError(err);
        done();
      });
    });

    after(function (done) {
      async.series([
        function (cb) {
          Snapshot.destroy({
            where: {
              owner: owner,
            },
          }).then(function (numDeleted) {
            console.log('deleted ' + numDeleted + ' snapshots');
            cb();
          }).catch(function (err) {
            console.error('snapshot cleanup error', err);
            cb(err);
          });
        },
        function (cb) {
          Project.destroy({
            where: {
              owner: owner,
            },
          }).then(function (numDeleted) {
            console.log('deleted ' + numDeleted + ' projects');
            cb();
          }).catch(function (err) {
            console.error('project cleanup error', err);
            cb(err);
          });
        },
      ], function (err) {
        assert.ifError(err);
        done();
      });
    });

    it('should create a snapshot', function createSnapshot(done) {
      var data = {
        owner: owner,
        projectId: projectId,
        projectVersion: 0,
        message: "test snapshot",
        type: "test",
        tags: {
          test: true,
          hello: "kitty",
          stuff: ["bing", "bang", "bong"],
          worldSeries: "cubs",
        },
      };

      request(app.proxy)
        .post('/api/snapshots')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert.notEqual(res.body.uuid, null);
          snapshotUUID0 = res.body.uuid;
          // console.log(res.body);
          assert.deepEqual(pick(res.body, keys(data)), data);
          assert.notEqual(res.body.projectUUID, null);
          assert.notEqual(res.body.createdAt, null);
          assert.notEqual(res.body.updatedAt, null);
          assert.deepEqual(res.body.keywords, []);
          done();
        });
    });

    it('should create a snapshot with most recent version', function createSnapshotMostRecent(done) {
      var data = {
        owner: owner,
        projectId: projectId,
        message: "test snapshot v1",
        type: "test",
        tags: {
          test: true,
          hello: "kitty",
          stuff: ["bing", "bang", "bong"],
          worldSeries: "cubs",
          version: "latest",
        },
      };

      request(app.proxy)
        .post('/api/snapshots')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert.notEqual(res.body.uuid, null);
          assert.notEqual(res.body.uuid, snapshotUUID0);
          // console.log(res.body);
          assert.deepEqual(pick(res.body, keys(data)), data);
          assert.equal(res.body.projectVersion, 1);
          assert.notEqual(res.body.projectUUID, null);
          assert.notEqual(res.body.createdAt, null);
          assert.notEqual(res.body.updatedAt, null);
          assert.deepEqual(res.body.keywords, []);
          done();
        });
    });

    it('should fetch a snaphost using UUID', function fetchByUUID(done) {
      request(app.proxy)
        .get('/api/snapshots/uuid/' + snapshotUUID0)
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert.equal(res.body.uuid, snapshotUUID0);
          assert.notEqual(res.body.projectUUID, null);
          assert.notEqual(res.body.updatedAt, null);
          assert.notEqual(res.body.createdAt, null);
          assert.equal(res.body.type, "test");
          assert.notEqual(res.body.message, null);
          assert.notEqual(res.body.tags, null);
          assert.equal(res.body.projectId, projectId);
          assert.notEqual(res.body.projectVersion, null);
          assert.deepEqual(res.body.keywords, []);
          done();
        });
    });

    it('should update snapshot for the same version', function updateSameVersion(done) {
      var data = {
        owner: owner,
        projectId: projectId,
        projectVersion: 0,
        message: "updated test snapshot",
        type: "order",
        tags: {
          test: true,
          hello: "kitty",
          stuff: ["bing", "bang", "bong", "BOOM"],
          worldSeries: "cubs",
          fuzzy: "dice",
        },
      };

      request(app.proxy)
        .post('/api/snapshots')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert.equal(res.body.uuid, snapshotUUID0);
          // console.log(res.body);
          assert.equal(res.body.type, "order");
          assert.equal(res.body.message, data.message);
          assert.deepEqual(res.body.tags, data.tags);
          assert.deepEqual(res.body.keywords, []);
          done();
        });
    });

    it('should create a new snapshot for new version of same project', function createNewVersion(done) {
      async.waterfall([
        function (cb) {
          var newProjectData = {
            foo: "bar",
            yes: "no",
            counts: {
              "1": 10,
              "2": 47,
            },
          };

          request(app.proxy)
            .post('/api/projects/' + projectId)
            .send({
              data: newProjectData,
            })
            .expect(200)
            .end(function (err, res) {
              assert.ifError(err);
              assert.notEqual(res, null);
              assert.notEqual(res.body, null);
              // console.log('update result:', res.body);
              assert.deepEqual(res.body.data, newProjectData);
              assert(res.body.version > 0);
              cb(null, res.body.version);
            });
        },
        function (newVersion, cb) {
          var newSnapshotData = {
            owner: owner,
            projectId: projectId,
            projectVersion: newVersion,
            message: "new test snapshot",
            type: "test",
            tags: {
              test: true,
              hello: "kitty",
              stuff: ["ying", "yang"],
            },
          };

          request(app.proxy)
            .post('/api/snapshots')
            .send(newSnapshotData)
            .expect(200)
            .end(function (err, res) {
              assert.ifError(err);
              assert.notEqual(res, null);
              assert.notEqual(res.body, null);
              assert.notEqual(res.body.uuid, null);
              snapshotUUID1 = res.body.uuid;
              // console.log(res.body);
              assert.deepEqual(pick(res.body, keys(newSnapshotData)), newSnapshotData);
              assert.notEqual(res.body.projectUUID, null);
              assert.notEqual(res.body.createdAt, null);
              assert.notEqual(res.body.updatedAt, null);
              assert.deepEqual(res.body.keywords, []);
              cb(null, null);
            });
        },
      ], function (err) {
        assert.ifError(err);
        done();
      });
    });

    it('should return 404 for fetch of non-existing snapshot', function fetchNotExist(done) {
      request(app.proxy)
        .get('/api/snapshots/blah')
        .expect(404)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert.notEqual(res.body.message, null);
          done();
        });
    });

    it('should fetch all snapshots for a project', function fetchAllSnapshots(done) {
      request(app.proxy)
        .get('/api/snapshots/' + projectId)
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert(Array.isArray(res.body));
          var snapshots = res.body;
          assert.equal(snapshots.length, 3);
          each(snapshots, function (snapshot) {
            assert.notEqual(snapshot.projectUUID, null);
            assert.notEqual(snapshot.updatedAt, null);
            assert.notEqual(snapshot.createdAt, null);
            assert.notEqual(snapshot.type, null);
            assert.notEqual(snapshot.message, null);
            assert.notEqual(snapshot.tags, null);
            assert.equal(snapshot.projectId, projectId);
            assert.notEqual(snapshot.projectVersion, null);
            assert.deepEqual(snapshot.keywords, []);
          });
          done();
        });
    });

    it('should fetch one snapshot for one project version', function fetchOneSnapshot(done) {
      request(app.proxy)
        .get('/api/snapshots/' + projectId + '?version=0')
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert(Array.isArray(res.body));
          var snapshots = res.body;
          assert.equal(snapshots.length, 1);
          var snapshot = snapshots[0];
          assert.notEqual(snapshot.projectUUID, null);
          assert.notEqual(snapshot.updatedAt, null);
          assert.notEqual(snapshot.createdAt, null);
          assert.equal(snapshot.type, "order");
          assert.notEqual(snapshot.message, null);
          assert.notEqual(snapshot.tags, null);
          assert.equal(snapshot.projectId, projectId);
          assert.equal(snapshot.projectVersion, 0);
          assert.deepEqual(snapshot.keywords, []);
          done();
        });
    });

    it('should return 404 for existence check for non-existing project', function testSnapshotExistsFail(done) {
      request(app.proxy)
        .head('/api/snapshots/aaaabbbba')
        .expect(404)
        .end(function (err, res) {
          assert.ifError(err);
          done();
        });
    });

    it('should check exists of snapshots for a project', function testSnapshotsExist(done) {
      async.waterfall([
        function (cb) {
          request(app.proxy)
            .head('/api/snapshots/' + projectId)
            .expect(200)
            .end(function (err, res) {
              assert.ifError(err);
              assert.notEqual(res, null);
              var latestSnapshot = res.get('Latest-Snapshot');
              assert.notEqual(latestSnapshot, null);
              cb(null, latestSnapshot);
            });
        },
        function (latestSnapshot, cb) {
          request(app.proxy)
            .get('/api/snapshots/uuid/' + latestSnapshot)
            .expect(200)
            .end(function (err, res) {
              assert.ifError(err);
              assert.notEqual(res, null);
              assert.notEqual(res.body, null);
              assert.equal(res.body.uuid, latestSnapshot);
              assert.notEqual(res.body.projectUUID, null);
              assert.notEqual(res.body.updatedAt, null);
              assert.notEqual(res.body.createdAt, null);
              assert.equal(res.body.type, "test");
              assert.notEqual(res.body.message, null);
              assert.notEqual(res.body.tags, null);
              assert.equal(res.body.projectId, projectId);
              assert.notEqual(res.body.projectVersion, null);
              assert.deepEqual(res.body.keywords, []);
              cb(null, null);
            });
        },
      ], function (err) {
        assert.ifError(err);
        done();
      });
    });

    it('should fetch snapshots with tags', function fetchByTags(done) {
      request(app.proxy)
        .post('/api/snapshots/tags')
        .send({
          hello: "kitty",
        })
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert(Array.isArray(res.body));
          var snapshots = res.body;
          assert.equal(snapshots.length, 3);
          each(snapshots, function (snapshot) {
            assert.notEqual(snapshot.projectUUID, null);
            assert.notEqual(snapshot.updatedAt, null);
            assert.notEqual(snapshot.createdAt, null);
            assert.notEqual(snapshot.type, null);
            assert.notEqual(snapshot.message, null);
            assert.notEqual(snapshot.tags, null);
            assert.equal(snapshot.projectId, projectId);
            assert.notEqual(snapshot.projectVersion, null);
          });
          done();
        });
    });

    // leaving this in as skipped as a reminder of limitations of querying with JSON objects
    // json keys must have values with homogeneous types
    it.skip('should fetch snapshots with differently-typed tags', function fetchByTags(done) {
      request(app.proxy)
        .post('/api/snapshots/tags')
        .send({
          hello: 5,
        })
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert(Array.isArray(res.body));
          var snapshots = res.body;
          assert.equal(snapshots.length, 0);
          done();
        });
    });

    it('should fetch snapshots with tags and projectId', function fetchByTagsProjectId(done) {
      request(app.proxy)
        .post('/api/snapshots/tags' + '?project=' + projectId)
        .send({
          test: true,
        })
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert(Array.isArray(res.body));
          var snapshots = res.body;
          assert.equal(snapshots.length, 3);
          each(snapshots, function (snapshot) {
            assert.notEqual(snapshot.projectUUID, null);
            assert.notEqual(snapshot.updatedAt, null);
            assert.notEqual(snapshot.createdAt, null);
            assert.notEqual(snapshot.type, null);
            assert.notEqual(snapshot.message, null);
            assert.notEqual(snapshot.tags, null);
            assert.equal(snapshot.projectId, projectId);
            assert.notEqual(snapshot.projectVersion, null);
            assert.deepEqual(snapshot.keywords, []);
          });
          done();
        });
    });

    it('should fetch one snapshot with tags', function fetchOneWithTags(done) {
      request(app.proxy)
        .post('/api/snapshots/tags')
        .send({
          fuzzy: "dice",
        })
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert(Array.isArray(res.body));
          var snapshots = res.body;
          assert.equal(snapshots.length, 1);
          each(snapshots, function (snapshot) {
            assert.notEqual(snapshot.projectUUID, null);
            assert.notEqual(snapshot.updatedAt, null);
            assert.notEqual(snapshot.createdAt, null);
            assert.notEqual(snapshot.type, null);
            assert.notEqual(snapshot.message, null);
            assert.notEqual(snapshot.tags, null);
            assert.equal(snapshot.projectId, projectId);
            assert.notEqual(snapshot.projectVersion, null);
            assert.deepEqual(snapshot.keywords, []);
          });
          done();
        });
    });

    it('should return 200 for fetch snapshots with junk tags', function fetchByTagsFail(done) {
      request(app.proxy)
        .post('/api/snapshots/tags')
        .send({
          pink: "flamingo",
        })
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          //note from max - changed this to a 204, sorry if the tests got messed up
          assert(Array.isArray(res.body));
          done();
        });
    });

    it('should create a snapshot with keywords array', function createSnapshotWithKeywords(done) {
      var data = {
        owner: owner,
        projectId: projectId,
        projectVersion: 1,
        message: "test snapshot",
        type: "test",
        tags: {
          test: true,
          hello: "kitty",
          stuff: ["bing", "bang", "bong"],
          worldSeries: "cubs",
        },
        keywords: ["fangle", "dangle", "tangle"],
      };

      request(app.proxy)
        .post('/api/snapshots')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert.notEqual(res.body.uuid, null);
          snapshotUUID0 = res.body.uuid;
          // console.log(res.body);
          assert.deepEqual(pick(res.body, keys(data)), data);
          assert.notEqual(res.body.projectUUID, null);
          assert.notEqual(res.body.createdAt, null);
          assert.notEqual(res.body.updatedAt, null);
          done();
        });
    });

    it('should fetch one snapshot using a keyword', function fetchWithKeyword(done) {
      request(app.proxy)
        .post('/api/snapshots/keywords')
        .send({
          keywords: ["dangle", "tangle"],
        })
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert(Array.isArray(res.body));
          var snapshots = res.body;
          assert.equal(snapshots.length, 1);
          each(snapshots, function (snapshot) {
            assert.notEqual(snapshot.projectUUID, null);
            assert.notEqual(snapshot.updatedAt, null);
            assert.notEqual(snapshot.createdAt, null);
            assert.notEqual(snapshot.type, null);
            assert.notEqual(snapshot.message, null);
            assert.notEqual(snapshot.tags, null);
            assert.equal(snapshot.projectId, projectId);
            assert.notEqual(snapshot.projectVersion, null);
            assert.notDeepEqual(snapshot.keywords, []);
          });
          done();
        });
    });

    it('should fetch one snapshot using keywords', function fetchWithKeyword(done) {
      request(app.proxy)
        .post('/api/snapshots/keywords')
        .send({
          keywords: ["fangle"],
        })
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert(Array.isArray(res.body));
          var snapshots = res.body;
          assert.equal(snapshots.length, 1);
          each(snapshots, function (snapshot) {
            assert.notEqual(snapshot.projectUUID, null);
            assert.notEqual(snapshot.updatedAt, null);
            assert.notEqual(snapshot.createdAt, null);
            assert.notEqual(snapshot.type, null);
            assert.notEqual(snapshot.message, null);
            assert.notEqual(snapshot.tags, null);
            assert.equal(snapshot.projectId, projectId);
            assert.notEqual(snapshot.projectVersion, null);
            assert.notDeepEqual(snapshot.keywords, []);
          });
          done();
        });
    });

    it('should create another snapshot with keywords array', function createSnapshotWithKeywords(done) {
      var data = {
        owner: owner,
        projectId: projectId,
        projectVersion: 0,
        message: "test snapshot",
        type: "test",
        tags: {
          test: true,
          hello: "kitty",
          stuff: ["bing", "bang", "bong"],
          worldSeries: "cubs",
        },
        keywords: ["dangle", "tangle", "Mangle", "Tangle"],
      };

      request(app.proxy)
        .post('/api/snapshots')
        .send(data)
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert.notEqual(res.body.uuid, null);
          snapshotUUID0 = res.body.uuid;
          // console.log(res.body);
          assert.deepEqual(omit(pick(res.body, keys(data)), 'keywords'), omit(data, 'keywords'));
          assert.deepEqual(res.body.keywords, uniq(map(data.keywords, function (kw) { return kw.toLowerCase(); })));
          assert.notEqual(res.body.projectUUID, null);
          assert.notEqual(res.body.createdAt, null);
          assert.notEqual(res.body.updatedAt, null);
          done();
        });
    });

    it('should fetch two snapshot using keywords', function fetchWithKeyword(done) {
      request(app.proxy)
        .post('/api/snapshots/keywords')
        .send({
          keywords: ["dangle", "tangle"],
        })
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert(Array.isArray(res.body));
          var snapshots = res.body;
          assert.equal(snapshots.length, 2);
          each(snapshots, function (snapshot) {
            assert.notEqual(snapshot.projectUUID, null);
            assert.notEqual(snapshot.updatedAt, null);
            assert.notEqual(snapshot.createdAt, null);
            assert.notEqual(snapshot.type, null);
            assert.notEqual(snapshot.message, null);
            assert.notEqual(snapshot.tags, null);
            assert.equal(snapshot.projectId, projectId);
            assert.notEqual(snapshot.projectVersion, null);
            assert.notDeepEqual(snapshot.keywords, []);
          });
          done();
        });
    });

    it('should fetch two snapshots using keywords and tags', function fetchWithKeywordsAndTags(done) {
      request(app.proxy)
        .post('/api/snapshots/keywords')
        .send({
          keywords: ["dangle", "tangle"],
          tags: {
            hello: "kitty",
          },
        })
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert(Array.isArray(res.body));
          var snapshots = res.body;
          assert.equal(snapshots.length, 2);
          each(snapshots, function (snapshot) {
            assert.notEqual(snapshot.projectUUID, null);
            assert.notEqual(snapshot.updatedAt, null);
            assert.notEqual(snapshot.createdAt, null);
            assert.notEqual(snapshot.type, null);
            assert.notEqual(snapshot.message, null);
            assert.notEqual(snapshot.tags, null);
            assert.equal(snapshot.projectId, projectId);
            assert.notEqual(snapshot.projectVersion, null);
            assert.notDeepEqual(snapshot.keywords, []);
          });
          done();
        });
    });

    it('should fetch a keywords map for all snapshots', function fetchAllKeywordsMap(done) {
      request(app.proxy)
        .post('/api/snapshots/kwm')
        .send({})
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert.equal(typeof res.body, 'object');
          var kwMap = res.body;
          assert.deepEqual(keys(kwMap), ['fangle', 'dangle', 'tangle', 'mangle']);
          assert.equal(kwMap.fangle, 1);
          assert.equal(kwMap.dangle, 2);
          assert.equal(kwMap.tangle, 2);
          assert.equal(kwMap.mangle, 1);
          done();
        });
    });

    it('should fetch a keywords map for snapshots matching specified keywords',
      function fetchKeywordsMapWithKeywords(done) {
        request(app.proxy)
          .post('/api/snapshots/kwm')
          .send({
            keywords: ['dangle'],
          })
          .expect(200)
          .end(function (err, res) {
            assert.ifError(err);
            assert.notEqual(res, null);
            assert.notEqual(res.body, null);
            assert.equal(typeof res.body, 'object');
            var kwMap = res.body;
            assert.deepEqual(keys(kwMap), ['fangle', 'dangle', 'tangle', 'mangle']);
            assert.equal(kwMap.fangle, 1);
            assert.equal(kwMap.dangle, 2);
            assert.equal(kwMap.tangle, 2);
            assert.equal(kwMap.mangle, 1);
            done();
          });
      });

    it('should fetch a keywords map for snapshots matching specified tags', function fetchKeywordsMapWithTags(done) {
      request(app.proxy)
        .post('/api/snapshots/kwm')
        .send({
          tags: {
            worldSeries: "cubs",
          },
        })
        .expect(200)
        .end(function (err, res) {
          assert.ifError(err);
          assert.notEqual(res, null);
          assert.notEqual(res.body, null);
          assert.equal(typeof res.body, 'object');
          var kwMap = res.body;
          assert.deepEqual(keys(kwMap), ['fangle', 'dangle', 'tangle', 'mangle']);
          assert.equal(kwMap.fangle, 1);
          assert.equal(kwMap.dangle, 2);
          assert.equal(kwMap.tangle, 2);
          assert.equal(kwMap.mangle, 1);
          done();
        });
    });

    it('should fetch a keywords map for snapshots matching specified tags',
      function fetchKeywordsMapWithTagsAndKeywords(done) {
        request(app.proxy)
          .post('/api/snapshots/kwm')
          .send({
            keywords: ['mangle'],
            tags: {
              worldSeries: "cubs",
            },
          })
          .expect(200)
          .end(function (err, res) {
            assert.ifError(err);
            assert.notEqual(res, null);
            assert.notEqual(res.body, null);
            assert.equal(typeof res.body, 'object');
            var kwMap = res.body;
            assert.deepEqual(keys(kwMap), ['dangle', 'tangle', 'mangle']);
            assert.equal(kwMap.dangle, 1);
            assert.equal(kwMap.tangle, 1);
            assert.equal(kwMap.mangle, 1);
            done();
          });
      });

    it('should fetch a keywords map for snapshots matching specified tags',
      function fetchKeywordsMapWithProjectId(done) {
        request(app.proxy)
          .post('/api/snapshots/kwm')
          .send({
            projectId: 'fooNO',
          })
          .expect(200)
          .end(function (err, res) {
            assert.ifError(err);
            assert.notEqual(res, null);
            assert.notEqual(res.body, null);
            assert.equal(typeof res.body, 'object');
            var kwMap = res.body;
            assert.deepEqual(kwMap, {});
            done();
          });
      });

    it('should fetch a keywords map for snapshots matching specified tags',
      function fetchKeywordsMapWithTagsAndKeywordsAndProjectId(done) {
        request(app.proxy)
          .post('/api/snapshots/kwm')
          .send({
            projectId: projectId,
            keywords: ['tangle'],
            tags: {
              worldSeries: "cubs",
            },
          })
          .expect(200)
          .end(function (err, res) {
            assert.ifError(err);
            assert.notEqual(res, null);
            assert.notEqual(res.body, null);
            assert.equal(typeof res.body, 'object');
            var kwMap = res.body;
            assert.deepEqual(keys(kwMap), ['fangle', 'dangle', 'tangle', 'mangle']);
            assert.equal(kwMap.fangle, 1);
            assert.equal(kwMap.dangle, 2);
            assert.equal(kwMap.tangle, 2);
            assert.equal(kwMap.mangle, 1);
            done();
          });
      });

    it('should delete a snapshot by UUID', function deleteByUUID(done) {
      async.series([
        function (cb) {
          request(app.proxy)
            .delete('/api/snapshots/uuid/' + snapshotUUID0)
            .expect(200)
            .end(function (err, res) {
              assert.ifError(err);
              assert.notEqual(res, null);
              assert.notEqual(res.body, null);
              assert.equal(res.body.numDeleted, 1);
              cb(err);
            });
        },
        function (cb) {
          request(app.proxy)
            .get('/api/snapshots/uuid/' + snapshotUUID0)
            .expect(404)
            .end(function (err, res) {
              assert.ifError(err);
              cb(err);
            });
        },
        function (cb) {
          Snapshot.findOne({
            where: {
              uuid: snapshotUUID0,
            }
          }).then(function (result) {
            assert.notEqual(result, null);
            assert.equal(result.get('status'), 0);
            cb(null);
          }).catch(cb);
        },
      ], function (err) {
        assert.ifError(err);
        done();
      });
    });

    it('should destroy a snapshot by UUID', function destroyByUUID(done) {
      async.series([
        function (cb) {
          request(app.proxy)
            .delete('/api/snapshots/uuid/' + snapshotUUID1 + '?destroy=true')
            .expect(200)
            .end(function (err, res) {
              assert.ifError(err);
              assert.notEqual(res, null);
              assert.notEqual(res.body, null);
              assert.equal(res.body.numDeleted, 1);
              cb(err);
            });
        },
        function (cb) {
          request(app.proxy)
            .get('/api/snapshots/uuid/' + snapshotUUID1)
            .expect(404)
            .end(function (err, res) {
              assert.ifError(err);
              cb(err);
            });
        },
        function (cb) {
          Snapshot.findOne({
            where: {
              uuid: snapshotUUID1,
            }
          }).then(function (result) {
            assert.equal(result, null);
            cb(null);
          }).catch(cb);
        },
      ], function (err) {
        assert.ifError(err);
        done();
      });
    });
  });
});
