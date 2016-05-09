import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import ConstructViewer from './graphics/views/constructviewer';
import ConstructViewerCanvas from './graphics/views/constructViewerCanvas';
import ProjectDetail from '../components/ProjectDetail';
import ProjectHeader from '../components/ProjectHeader';
import Inventory from './Inventory';
import Inspector from './Inspector';
import { projectList, projectLoad, projectCreate, projectOpen } from '../actions/projects';
import { uiSetGrunt } from '../actions/ui';
import { focusProject } from '../actions/focus';
import autosaveInstance from '../store/autosave/autosaveInstance';

import '../styles/ProjectPage.css';
import '../styles/SceneGraphPage.css';

class ProjectPage extends Component {
  static propTypes = {
    projectId: PropTypes.string.isRequired,
    project: PropTypes.object, //if have a project (not fetching)
    constructs: PropTypes.array, //if have a project (not fetching)
    projectCreate: PropTypes.func.isRequired,
    projectList: PropTypes.func.isRequired,
    projectLoad: PropTypes.func.isRequired,
    projectOpen: PropTypes.func.isRequired,
    uiSetGrunt: PropTypes.func.isRequired,
    focusProject: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.lastProjectId = null;
    this.layoutAlgorithm = 'wrap';
  }

  componentDidMount() {
    // todo - use react router History to do this:
    // https://github.com/mjackson/history/blob/master/docs/ConfirmingNavigation.md
    window.onbeforeunload = window.onunload = this.onWindowUnload;
  }

  componentWillReceiveProps(nextProps) {
    //set state.focus.project -- might be a better way to do this, but hard otuside components with react-router
    if (!this.lastProjectId || nextProps.projectId !== this.props.projectId) {
      this.lastProjectId = nextProps.projectId;
      this.props.focusProject(nextProps.projectId);
    }
  }

  componentWillUnmount() {
    window.onbeforeunload = window.onunload = () => {};
  }

  onWindowUnload(evt) {
    if (autosaveInstance.isDirty() && process.env.NODE_ENV === 'production') {
      return 'Project has unsaved work! Please save before leaving this page';
    }
  }

  onLayoutChanged = () => {
    this.layoutAlgorithm = this.refs.layoutSelector.value;
    this.forceUpdate();
  };

  render() {
    const { project, projectId, constructs } = this.props;

    //handle project not loaded
    if (!project || !project.metadata) {
      this.props.projectLoad(projectId)
        .catch(err => {
          //if couldnt load project, load manifests and display the first one, or create a new project
          this.props.uiSetGrunt(`Project with ID ${projectId} could not be loaded, loading another instead...`);

          this.props.projectList().then(manifests => {
            if (manifests.length) {
              const nextId = manifests[0].id;
              //need to fully load the project, as we just have the manifest right now...
              //otherwise no blocks will show
              //ideally, this would just get ids
              this.props.projectLoad(nextId)
                .then(() => this.props.projectOpen(nextId));
            } else {
              //if no manifests, create a new project
              const newProject = this.props.projectCreate();
              this.props.projectOpen(newProject.id);
            }
          });
        });
      return (<p>loading project...</p>);
    }

    // build a list of construct viewers
    const constructViewers = constructs.filter(construct => construct).map(construct => {
      return (
        <ConstructViewer key={construct.id}
                         projectId={projectId}
                         constructId={construct.id}
                         layoutAlgorithm={this.layoutAlgorithm}/>
      );
    });

    return (
      <div className="ProjectPage">
        <Inventory projectId={projectId}/>

        <div className="ProjectPage-content">

          <ProjectHeader project={project}/>

          <ConstructViewerCanvas
            currentProjectId={this.props.projectId}>
            {constructViewers}
          </ConstructViewerCanvas>

          <ProjectDetail project={project}/>
        </div>

        <Inspector projectId={projectId}/>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const projectId = ownProps.params.projectId;
  const project = state.projects[projectId];

  if (!project) {
    return {
      projectId,
    };
  }

  const constructs = project.components.map(componentId => state.blocks[componentId]);
  return {
    projectId,
    project,
    constructs,
  };
}

export default connect(mapStateToProps, {
  projectList,
  projectLoad,
  projectCreate,
  projectOpen,
  uiSetGrunt,
  focusProject,
})(ProjectPage);
