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
import bodyParser from 'body-parser';
import { errorDoesNotExist } from '../utils/errors';
import { clientBundleUrl, defaultClientFilePath } from './constants';
import { getExtensions, getClientExtensions } from './registry';
import loadExtension, { getExtensionInternalPath } from './loadExtension';
import errorHandlingMiddleware from '../utils/errorHandlingMiddleware';
import extensionApiRouter from './apiRouter';
import {
  checkUserExtensionActive,
  checkUserExtensionAccess,
  checkExtensionExistsMiddleware,
  checkUserExtensionAccessMiddleware,
  checkExtensionIsClientMiddleware,
  checkExtensionIsServerMiddleware,
} from './middlewareChecks';
import { manifestIsServer, manifestIsClient } from './manifestUtils';
import { ensureReqUserMiddleware } from '../auth/utils';

//native extensions
import csvRouter from './native/csv/index';
import fastaRouter from './native/fasta/index';
import genbankRouter from './native/genbank/index';

const router = express.Router(); //eslint-disable-line new-cap
const jsonParser = bodyParser.json();

router.use(jsonParser);
router.use(errorHandlingMiddleware);
router.use(ensureReqUserMiddleware);

//see all extensions you have access to, e.g. for choosing which to show
router.get('/listAll', (req, res) => {
  // in dev, running locally, so dont check - you can see them all.
  // This way, dont need to add extension to user permissions so can just symlink into node_modules without problem.
  const accessFilter = (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') ?
    () => true :
    (manifest, key) => {
      return checkUserExtensionAccess(manifest, req.user);
    };

  res.json(getExtensions(accessFilter));
});

//see currently visible extensions - client and server, unless pass scope
router.get('/list/:scope?', (req, res, next) => {
  const { scope } = req.params;

  let scopeFilter;
  switch (scope) {
  case 'client':
    scopeFilter = manifestIsClient;
    break;
  case 'server':
    scopeFilter = manifestIsServer;
    break;
  default:
    scopeFilter = () => true;
  }

  const activeFilter = (manifest, key) => {
    return checkUserExtensionActive(manifest, req.user);
  };

  //filters to extensions which are visible
  const clientExtensions = getExtensions(scopeFilter, activeFilter);

  res.json(clientExtensions);
});

router.get('/manifest/:extension',
  checkExtensionExistsMiddleware,
  checkUserExtensionAccessMiddleware,
  (req, res, next) => {
    const { extension } = req.params;
    const manifest = getExtensions()[extension];

    if (!manifest) {
      return res.status(400).send(errorDoesNotExist);
    }

    return res.json(manifest);
  });

//load extensions
//only for client extensions
//dependent on whether in production (only client bundle) or not (send any file)

if (process.env.NODE_ENV !== 'production') {
  //make the whole extension available
  router.get('/load/:extension/:filePath?',
    checkExtensionExistsMiddleware,
    checkUserExtensionAccessMiddleware,
    checkExtensionIsClientMiddleware,
    (req, res, next) => {
      const { filePath = clientBundleUrl, extension } = req.params;
      const extensionFile = getExtensionInternalPath(extension, filePath);

      res.sendFile(extensionFile, (err) => {
        if (err) {
          console.log('error sending extension!', err);
          console.log(err.stack);
          //don't write headers because express may complain about them already being set
        }
        //force ending of response, since lib/response seems not to if we provide a callback
        return res.end();
      });
    });
} else {
  //only index.js (i.e. clientBundleUrl) files are available

  router.get('/load/:extension/:filePath?',
    checkExtensionExistsMiddleware,
    checkUserExtensionAccessMiddleware,
    checkExtensionIsClientMiddleware,
    (req, res, next) => {
      const { extension } = req.params;

      loadExtension(extension)
        .then(manifest => {
          const filePath = getExtensionInternalPath(extension);
          res.sendFile(filePath, (err) => {
            if (err) {
              console.log('error sending extension!', err);
              console.log(err.stack);
              //don't write headers because express may complain about them already being set
            }
            //force ending of response, since lib/response seems not to if we provide a callback
            return res.end();
          });
        })
        //shouldn't hit this 404, middleware should catch but handle other errors
        .catch(err => {
          if (err === errorDoesNotExist) {
            return res.status(404).send(errorDoesNotExist);
          }
          next(err);
        });
    });
}

//handle native extensions which are included statically
router.use('/api/csv', csvRouter);
router.use('/api/fasta', fastaRouter);
router.use('/api/genbank', genbankRouter);

//other /api routes deleted to extension API router
router.use('/api', extensionApiRouter);

export default router;
