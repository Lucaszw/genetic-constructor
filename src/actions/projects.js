import * as ActionTypes from '../constants/ActionTypes';
import { saveProject, loadProject, snapshot, listProjects } from '../middleware/data';
import * as projectSelectors from '../selectors/projects';
import * as undoActions from '../store/undo/actions';
import { push } from 'react-router-redux';

import Block from '../models/Block';
import Project from '../models/Project';
import { pauseAction, resumeAction } from '../store/pausableStore';

import { getItem, setItem } from '../middleware/localStorageCache';
const recentProjectKey = 'mostRecentProject';

//todo - should this go in the reducers (i.e. a cache outside store state)? One for projects, one for blocks? Then compare rollup components to those directly. That way we can track individual resources more easily rather than just whole rollups.
//note that goal is to track lastSaved versions, and so the cache if in the reducer should handle dirty tracking

//Promise
export const projectList = () => {
  return (dispatch, getState) => {
    return listProjects()
      .then(projectManifests => {
        const projects = projectManifests.map(manifest => new Project(manifest));

        dispatch({
          type: ActionTypes.PROJECT_LIST,
          projects,
        });

        return projects;
      });
  };
};

//Promise
//this is a background save (e.g. autosave)
export const projectSave = (inputProjectId) => {
  return (dispatch, getState) => {
    //if dont pass project id, get the currently viewed one
    const projectId = !!inputProjectId ? inputProjectId : getState().focus.projectId;
    if (!projectId) {
      return Promise.resolve(null);
    }

    const roll = dispatch(projectSelectors.projectCreateRollup(projectId));
    setItem(recentProjectKey, projectId);

    return saveProject(projectId, roll)
      .then(commitInfo => {
        if (!commitInfo) {
          return null;
        }

        const { sha } = commitInfo;
        dispatch({
          type: ActionTypes.PROJECT_SAVE,
          projectId,
          sha,
        });
        return sha;
      });
  };
};

//Promise
//explicit save e.g. an important point
export const projectSnapshot = (projectId, message, withRollup = true) => {
  return (dispatch, getState) => {
    const roll = withRollup ?
      dispatch(projectSelectors.projectCreateRollup(projectId)) :
      {};

    return snapshot(projectId, message, roll)
      .then(commitInfo => {
        if (!commitInfo) {
          return null;
        }

        const { sha } = commitInfo;
        dispatch({
          type: ActionTypes.PROJECT_SNAPSHOT,
          projectId,
          sha,
        });
        return sha;
      });
  };
};

//Promise
export const projectLoad = (projectId) => {
  return (dispatch, getState) => {
    return loadProject(projectId)
      .then(rollup => {
        const { project, blocks } = rollup;
        const projectModel = new Project(project);

        dispatch(pauseAction());
        dispatch(undoActions.transact());

        dispatch({
          type: ActionTypes.BLOCK_STASH,
          blocks: blocks.map((blockObject) => new Block(blockObject)),
        });

        dispatch({
          type: ActionTypes.PROJECT_LOAD,
          project: projectModel,
        });

        dispatch(undoActions.commit());
        dispatch(resumeAction());

        return project;
      });
  };
};

//create a new project
export const projectCreate = (initialModel) => {
  return (dispatch, getState) => {
    const project = new Project(initialModel);
    dispatch({
      type: ActionTypes.PROJECT_CREATE,
      project,
    });

    //after we've created it, let's save it real quick so it persists + gets a version
    //we can do this in the background
    projectSave(project.id);

    return project;
  };
};

//this is a backup for performing arbitrary mutations
export const projectMerge = (projectId, toMerge) => {
  return (dispatch, getState) => {
    const oldProject = getState().projects[projectId];
    const project = oldProject.merge(toMerge);
    dispatch({
      type: ActionTypes.PROJECT_MERGE,
      undoable: true,
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
      undoable: true,
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
      undoable: true,
      project,
    });
    return project;
  };
};

//Promise
//default to most recent project if falsy
export const projectOpen = (inputProjectId) => {
  return (dispatch, getState) => {
    //save the current project
    return dispatch(projectSave())
      .then(() => {
        //dont need to load the project, projectPage will handle that
        const projectId = !!inputProjectId ? inputProjectId : getItem(recentProjectKey);
        //alternatively, we can just call react-router's browserHistory.push() directly
        dispatch(push(`/project/${projectId}`));
      });
  };
};

//Adds a construct to a project. Does not create the construct. Use blocks.js
export const projectRemoveConstruct = (projectId, componentId) => {
  return (dispatch, getState) => {
    const oldProject = getState().projects[projectId];
    const project = oldProject.removeComponents(componentId);
    dispatch({
      type: ActionTypes.PROJECT_REMOVE_CONSTRUCT,
      undoable: true,
      project,
    });
    return project;
  };
};
