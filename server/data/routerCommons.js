/*
 Copyright 2016 Autodesk,Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import express from 'express';
import _ from 'lodash';

import { projectIdParamAssignment, ensureReqUserMiddleware, userOwnsProjectMiddleware } from './permissions';
import * as commons from './persistence/commons';

const router = express.Router(); //eslint-disable-line new-cap

const convertTagsStrings = tags => _.forEach(tags, (val, key) => {
  if (typeof val !== 'string') {
    tags[key] = String(val);
  }
});

// check user and project Id valid
router.param('projectId', projectIdParamAssignment);

router.param('version', (req, res, next, id) => {
  if (id) {
    Object.assign(req, { version: parseInt(id, 10) });
  }
  next();
});

router.use(ensureReqUserMiddleware);

// routes

//expects object in form { tags: {}, keywords: [] }
router.route('/query')
.post((req, res, next) => {
  const query = req.body;

  return commons.commonsQuery(query)
  .then(results => res.json(results))
  .catch(next);
});

router.route('/:projectId/:version?')
// get the published project, @ version, or latest
.get(
  commons.checkProjectPublicMiddleware,
  (req, res, next) => {
    const { projectId, version } = req;

    //request all versions
    if (version === 'versions') {
      return commons.commonsRetrieveVersions(projectId)
      .then(results => res.json(results))
      .catch(next);
    }

    return commons.commonsRetrieve(projectId, version)
    .then(project => res.status(200).json(project))
    .catch(next);
  })

// publish, given projectId and version
.post(
  userOwnsProjectMiddleware,
  (req, res, next) => {
    if (req.projectDoesNotExist) {
      res.status(404).send('Project does not yet exist');
    }

    const { user, projectId, version } = req;
    const { message, tags } = req.body;
    convertTagsStrings(tags);

    commons.commonsPublishVersion(projectId, user.uuid, version, { message, tags })
    .then(info => res.json(info))
    .catch(next);
  })

/*
 //deprecate
 //publish, given rollup, at new version
 .put(
 userOwnsProjectMiddleware,
 (req, res, next) => {
 res.status(501).send('test this route');

 const { user, projectId } = req;
 const { rollup, message, tags } = req.body;
 convertTagsStrings(tags);

 commons.commonsPublish(projectId, user.uuid, rollup, { message, tags })
 .then(info => res.json(info))
 .catch(next);
 })
 */

// unpublish
.delete(
  userOwnsProjectMiddleware,
  (req, res, next) => {
    const { user, projectId, version } = req;

    commons.commonsUnpublish(projectId, user.uuid, version)
    .then(info => res.json(info))
    .catch(next);
  });

//catch-all
router.route('*').all((req, res) => res.status(501).send());

export default router;
