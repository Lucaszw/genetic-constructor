import React, {Component, PropTypes} from 'react';
import {Link} from 'react-router';
import {connect} from 'react-redux';
import {pushState} from 'redux-router';
import MenuBar from '../components/Menu/MenuBar';
import { listProjects } from '../middleware/api';
import { projectCreate, projectAddConstruct, projectSave, projectLoad } from '../actions/projects';
import { blockCreate } from '../actions/blocks';

import '../styles/GlobalNav.css';

class GlobalNav extends Component {
  static propTypes = {
    pushState: PropTypes.func.isRequired,
    projectCreate: PropTypes.func.isRequired,
    projectAddConstruct: PropTypes.func.isRequired,
    projectSave: PropTypes.func.isRequired,
    projectLoad: PropTypes.func.isRequired,
    currentProjectId: PropTypes.string,
    blockCreate: PropTypes.func.isRequired,
    showMainMenu: PropTypes.bool.isRequired,
  };

  state = {
    showAddProject: false,
    recentProjects: [],
  };

  componentDidMount() {
    listProjects().then(projects => this.setState({recentProjects: projects}));
  }

  menuBar() {
    const recentProjects = this.state.recentProjects
    .map(project => ({
      text: project.metadata.name || 'My Project',
      action: () => {
        this.props.projectLoad(project.id)
          .then(() => this.props.pushState(null, `/project/${project.id}`));
      },
    }));

    return (<MenuBar
      menus={[
        {
          text: 'FILE',
          items: [
            {
              text: 'Recent Projects',
              disabled: true,
            },
            ...recentProjects,
            {},
            {
              text: 'Save Project',
              action: () => {
                this.props.projectSave(this.props.currentProjectId);
              },
            },
            {},
            {
              text: 'New Project',
              action: () => {
                const project = this.props.projectCreate();
                this.props.pushState(null, `/project/${project.id}`);
              },
            }, {
              text: 'New Construct',
              action: () => {
                const block = this.props.blockCreate();
                this.props.projectAddConstruct(this.props.currentProjectId, block.id);
              },
            }, {
              text: 'New Construct from Clipboard',
              action: () => {},
            }, {
              text: 'New Instance',
              action: () => {},
            }, {}, {
              text: 'Invite Collaborators',
              action: () => {},
            }, {
              text: 'Upload Genbank File',
              action: () => {},
            }, {
              text: 'Download Genbank File',
              action: () => {},
            }, {
              text: 'Export PDF',
              action: () => {},
            }, {}, {
              text: 'Publish to Gallery',
              action: () => {},
            },
          ],
        },
        {
          text: 'EDIT',
          items: [
            {
              text: 'Undo',
              action: () => {},
            }, {
              text: 'Redo',
              action: () => {},
            }, {}, {
              text: 'Cut',
              action: () => {},
            }, {
              text: 'Copy',
              action: () => {},
            }, {
              text: 'Copy As...',
              action: () => {},
            }, {
              text: 'Paste',
              action: () => {},
            }, {}, {
              text: 'Rename',
              action: () => {},
            }, {
              text: 'Duplicate',
              action: () => {},
            }, {
              text: 'Delete',
              action: () => {},
            }, {}, {
              text: 'Crop Sequence to Selection',
              action: () => {},
            }, {}, {
              text: 'Convert to List',
              action: () => {},
            }, {
              text: 'Convert to Construct',
              action: () => {},
            },
          ],
        },
        {
          text: 'VIEW',
          items: [
            {
              text: 'Inventory',
              action: () => {},
            }, {
              text: 'Inspector',
              action: () => {},
            }, {
              text: 'Toolbar',
              action: () => {},
            }, {
              text: 'History',
              action: () => {},
            }, {
              text: 'Sequence',
              action: () => {},
            }, {}, {
              text: 'Hide/Show Annotations',
              action: () => {},
            }, {
              text: 'Hide/Show List Contents',
              action: () => {},
            }, {
              text: 'Compare...',
              action: () => {},
            }, {}, {
              text: 'Labels Only',
              action: () => {},
            }, {
              text: 'Symbols Only',
              action: () => {},
            }, {
              text: 'Labels + Symbols',
              action: () => {},
            }, {
              text: 'Custom',
              action: () => {},
            }, {}, {
              text: 'Full Width',
              action: () => {},
            }, {
              text: 'Compact',
              action: () => {},
            }, {
              text: 'Wrap',
              action: () => {},
            }, {}, {
              text: 'Preview Deletions',
              action: () => {},
            },
          ],
        },
        {
          text: 'HELP',
          items: [
            {
              text: 'User Guide',
              action: () => {},
            }, {
              text: 'Show Tutorial',
              action: () => {},
            }, {
              text: 'Keyboard Shortcuts',
              action: () => {},
            }, {
              text: 'Community Forum',
              action: () => {},
            }, {
              text: 'Get Support',
              action: () => {},
            }, {
              text: 'Give Us Feedback',
              action: () => {},
            }, {}, {
              text: 'About Genome Designer',
              action: () => {},
            }, {
              text: 'Terms of Use',
              action: () => {},
            }, {
              text: 'Privacy Policy',
              action: () => {},
            },
          ],
        },
      ]}/>);
  }

  render() {
    return (
      <div className="GlobalNav">
        <span className="GlobalNav-title">GD</span>
        {this.props.showMainMenu ? this.menuBar() : null}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    currentProjectId: state.router.params.projectId,
    showMainMenu: state.ui.showMainMenu,
  };
}

export default connect(mapStateToProps, {
  projectAddConstruct,
  projectCreate,
  projectSave,
  projectLoad,
  blockCreate,
  pushState,
})(GlobalNav);
