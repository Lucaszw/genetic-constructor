import * as ActionTypes from '../constants/ActionTypes';
import { saveProjectRollup, loadProject, snapshot } from '../middleware/api';
import * as projectSelectors from '../selectors/projects';

import Project from '../models/Project';

//create a new project
export const projectCreate = (initialModel) => {
  return (dispatch, getState) => {
    const project = new Project(initialModel);
    dispatch({
      type: ActionTypes.PROJECT_CREATE,
      project,
    });
    return project;
  };
};

//Promise
export const projectSave = (projectId) => {
  return (dispatch, getState) => {
    const project = getState().projects[projectId];
    const roll = dispatch(projectSelectors.projectCreateRollup(projectId));
    return saveProjectRollup(projectId, roll)
      .then(json => {
        dispatch({
          type: ActionTypes.PROJECT_SAVE,
          project,
        });
        return json;
      });
  };
};

export const projectSnapshot = (projectId, message) => {
  return (dispatch, getState) => {
    const project = getState().projects[projectId];
    const roll = dispatch(projectSelectors.projectCreateRollup(projectId));
    return snapshot(projectId, roll, message)
      .then(sha => {
        dispatch({
          type: ActionTypes.PROJECT_SNAPSHOT,
          sha,
        });
        return sha;
      });
  };
};

export const projectLoad = (projectId) => {
  return (dispatch, getState) => {
    return loadProject(projectId)
      .then(rollup => {
        const { project, blocks } = rollup;
        dispatch({
          type: ActionTypes.PROJECT_LOAD,
          project,
        });
        //todo - ensure this loads the blocks, in the right reducer
        blocks.forEach((block) => {
          dispatch({
            type: ActionTypes.BLOCK_LOAD,
            block,
          });
        });
        return project;
      });
  };
};

//this is a backup for performing arbitrary mutations
export const projectMerge = (projectId, toMerge) => {
  return (dispatch, getState) => {
    const oldProject = getState().projects[projectId];
    const project = oldProject.merge(toMerge);
    dispatch({
      type: ActionTypes.PROJECT_MERGE,
      project,
    });
    return project;
  };
};

export const projectRename = (projectId, newName) => {
  return (dispatch, getState) => {
    const oldProject = getState().projects[projectId];
    const project = oldProject.mutate('metadata.name', newName);
    dispatch({
      type: ActionTypes.PROJECT_RENAME,
      project,
    });
    return project;
  };
};

//Adds a construct to a project. Does not create the construct. Use blocks.js
export const projectAddConstruct = (projectId, componentId) => {
  return (dispatch, getState) => {
    const oldProject = getState().projects[projectId];
    const project = oldProject.addComponents(componentId);
    dispatch({
      type: ActionTypes.PROJECT_ADD_CONSTRUCT,
      project,
    });
    return project;
  };
};
