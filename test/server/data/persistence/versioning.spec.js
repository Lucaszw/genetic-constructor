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
import { assert, expect } from 'chai';
import path from 'path';
import uuid from 'node-uuid';
import merge from 'lodash.merge';
import { updateProjectWithAuthor } from '../../../utils/userUtils';
import md5 from 'md5';
import { testUserId } from '../../../constants';
import { errorInvalidModel, errorAlreadyExists, errorDoesNotExist } from '../../../../server/utils/errors';
import {
  fileExists,
  fileRead,
  fileWrite,
  fileDelete,
  directoryExists,
  directoryMake,
  directoryDelete
} from '../../../../server/utils/fileSystem';
import Project from '../../../../src/models/Project';
import Block from '../../../../src/models/Block';

import * as filePaths from '../../../../server/utils/filePaths';
import * as versioning from '../../../../server/data/versioning';
import * as persistence from '../../../../server/data/persistence';
import * as s3 from '../../../../server/data/persistence/s3';

describe('Server', () => {
  describe('Data', () => {
    describe('persistence', function persistenceTests() {
      describe('versioning', () => {
        const userId = testUserId;

        let versionLog;
        let versions;
        const nonExistentSHA = '795c5751c8e0b0c9b5993ec81928cd89f7eefd27';
        const projectData = new Project(updateProjectWithAuthor());
        const projectId = projectData.id;
        const projectRepoDataPath = filePaths.createProjectDataPath(projectId);
        const newProject = projectData.merge({ projectData: 'new stuff' });

        const blockData = Block.classless({ projectId });
        const blockId = blockData.id;
        const newBlock = merge({}, blockData, { blockData: 'new data' });

        //skip test suite if not using s3
        before(function () {
          if (s3.useRemote) {
            this.skip();
          }

          return persistence.projectCreate(projectId, projectData, userId) //3
            .then(() => persistence.blockWrite(projectId, blockData))
            .then(() => persistence.projectSave(projectId, userId)) //2
            .then(() => persistence.projectWrite(projectId, newProject, userId))
            .then(() => persistence.projectSave(projectId, userId)) //1
            .then(() => persistence.blockWrite(projectId, newBlock))
            .then(() => persistence.projectSave(projectId, userId)) //0
            .then(() => versioning.log(projectRepoDataPath))
            .then(log => {
              versionLog = log;
              versions = versionLog.map(commit => commit.sha);
            });
        });

        it('projectExists() rejects if invalid version', () => {
          return persistence.projectExists(projectId, 'invalidSHA')
            .then(result => assert(false, 'should not resolve'))
            .catch(err => assert(err === errorDoesNotExist, 'wrong error type -> function errored...'));
        });

        it('projectExists() rejects if version does not exist', () => {
          return persistence.projectExists(projectId, nonExistentSHA)
            .then(result => assert(false, 'should not resolve'))
            .catch(err => assert(err === errorDoesNotExist, 'wrong error type -> function errored...'));
        });

        it('projectExists() resolves if version exists', () => {
          return persistence.projectExists(projectId, versions[1]);
        });

        it('projectGet() rejects on if given invalid version', () => {
          return persistence.projectGet(projectId, nonExistentSHA)
            .then(result => assert(false, 'should not resolve'))
            .catch(err => assert(err === errorDoesNotExist, 'wrong error type -> function errored...'));
        });

        it('projectGet() resolves to correct file when given version', () => {
          return persistence.projectGet(projectId, versions[2])
            .then(project => expect(project).to.eql(projectData));
        });

        it('projectGet() defaults to latest version', () => {
          return persistence.projectGet(projectId)
            .then(project => expect(project).to.eql(Object.assign({}, newProject, {
              version: versions[0],
              lastSaved: versionLog[0].time
            })));
        });

        it('blockExists() rejects on invalid version', () => {
          return persistence.blocksExist(projectId, nonExistentSHA, blockId)
            .then(result => assert(false, 'should not resolve'))
            .catch(err => assert(err === errorDoesNotExist, 'wrong error type -> function errored...'));
        });

        it('blockExists() accepts a version', () => {
          return persistence.blocksExist(projectId, versions[2], blockId);
        });

        it('blockGet() accepts a version, gets version at that time', () => {
          return persistence.blocksGet(projectId, versions[2], blockId)
            .then(blockMap => blockMap[blockId])
            .then(block => expect(block).to.eql(blockData));
        });

        it('blockGet() defaults to latest version', () => {
          return persistence.blocksGet(projectId, false, blockId)
            .then(blockMap => blockMap[blockId])
            .then(block => expect(block).to.eql(newBlock));
        });
      });
    });
  });
});