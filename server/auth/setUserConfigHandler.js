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

import fetch from 'isomorphic-fetch';
import { INTERNAL_HOST, API_END_POINT } from '../urlConstants';
import { pruneUserObject, updateUserConfig } from './utils';
import { headersPost } from '../../src/middleware/headers';

//parameterized route handler for setting user config
//expects req.user and req.config to be set
export default function setUserConfigHandler({ useRegister = false }) {
  const url = useRegister === true ?
  INTERNAL_HOST + '/auth/register' :
  INTERNAL_HOST + '/auth/update-user';

  return (req, res, next) => {
    const { user: userInput, config: configInput } = req;
    let user;

    try {
      user = updateUserConfig(userInput, configInput);
    } catch (err) {
      return res.status(422).send(err);
    }

    const postOptions = headersPost(JSON.stringify(user));

    //to update user, issues with setting cookies as auth and making a new fetch, so call user update function
    //might want to abstract to same across local + real auth
    if (process.env.BIO_NANO_AUTH && !useRegister) {
      const userPromises = require('bio-user-platform').userPromises({
        apiEndPoint: API_END_POINT,
      });

      return userPromises.update(user)
        .then(updatedUser => {
          const pruned = pruneUserObject(updatedUser);
          res.json(pruned);
        })
        .catch(err => {
          console.log('error setting user config');
          console.log(err);
          res.status(501).send(err);
        });
    }

    //todo - handle them already being registered (either with GC or with auth platform)

    // otherwise, delegate to auth routes
    // Real auth - dont need to worry about passing cookies on fetch, since registering (not authenticated)
    // local auth - just call our mock routes
    return fetch(url, postOptions)
      .then(resp => {
        //re-assign cookies from platform authentication
        const cookies = resp.headers.getAll('set-cookie');
        cookies.forEach(cookie => {
          res.set('set-cookie', cookie);
        });

        return resp.json();
      })
      .then(userPayload => {
        if (!!userPayload.message) {
          return Promise.reject(userPayload);
        }

        const pruned = pruneUserObject(userPayload);
        res.json(pruned);
      })
      .catch(err => {
        console.log('got error');
        console.log(err);
        res.status(500).json(err);
      });
  };
}