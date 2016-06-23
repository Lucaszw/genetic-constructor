import React, { PropTypes, Component } from 'react';
import { connect } from 'react-redux';
import autosaveInstance from '../../store/autosave/autosaveInstance';
import { getProjectSaveState } from '../../store/saveState';
import { uiSaveFailure } from '../../actions/ui';

import '../../styles/AutosaveTracking.css';

export class autosaveTracking extends Component {
  static propTypes = {
    projectId: PropTypes.string.isRequired,
    uiSaveFailure: PropTypes.func.isRequired,
  };

  state = {
    text: '',
  };

  componentDidMount() {
    this.interval = setInterval(() => {
      this.forceUpdate();
    }, 500);
  }

  componentDidUpdate() {
    const { projectId, uiSaveFailure } = this.props;
    const saveState = getProjectSaveState(projectId);
    const { saveSuccessful, lastErrOffline } = saveState;

    //there was an error saving, they are in a bad state
    if (!saveSuccessful && !lastErrOffline) {
      uiSaveFailure();
      clearInterval(this.interval);
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const { projectId } = this.props;
    const saveState = getProjectSaveState(projectId);
    const { lastSaved, saveDelta, saveSuccessful } = saveState;
    const dirty = autosaveInstance.isDirty();

    let text;
    if (!saveSuccessful) {
      text = `Last Saved: ${(new Date(lastSaved)).toLocaleTimeString()}`;
    } else if (dirty || saveDelta > 15000) {
      text = '';
    } else if (saveDelta <= 500) {
      //we're not actually saving... we're just faking it...
      text = 'Saving...';
    } else {
      text = 'Project Saved';
    }

    return (<span className="AutosaveTracking">{text}</span>);
  }
}

export default connect(() => ({}), {
  uiSaveFailure,
})(autosaveTracking);
