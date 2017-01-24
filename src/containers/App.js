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
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';

import track from '../analytics/ga';
import AboutForm from '../components/modal/aboutform';
import InlineEditor from '../components/inline-editor/inline-editor';
import ExtensionPicker from '../components/modal/ExtensionPicker';
import ReportErrorModal from '../components/modal/ReportErrorModal';
import ModalSpinner from '../components/modal/modalspinner';
import '../styles/App.css';
import GlobalNav from './GlobalNav';
import RibbonGrunt from '../components/ribbongrunt';
import AuthenticationModals from './AuthenticationModals';

class App extends Component {
  static propTypes = {
    children: PropTypes.node, // Injected by React Router
    currentProjectId: PropTypes.string,
    location: PropTypes.shape({
      pathname: PropTypes.string.isRequired,
    }).isRequired,
    spinMessage: PropTypes.string.isRequired,
  };

  static rejectBackspace(evt) {
    const rx = /INPUT|SELECT|TEXTAREA/i;
    if (evt.which === 8) { // 8 == backspace
      if (evt.target.hasAttribute('contenteditable')) {
        return;
      }
      if (!rx.test(evt.target.tagName) || evt.target.disabled || evt.target.readOnly) {
        evt.preventDefault();
      }
    }
  }

  /**
   * attempt to eat backspace keys ( to prevent navigation ) unless an interactive
   * element is the target
   */
  componentDidMount() {
    document.addEventListener('keydown', App.rejectBackspace);
    document.addEventListener('keypress', App.rejectBackspace);

    // in production, track top level, unhandled exceptions in the app
    // not in production, ignore this so we dont garble the callstack
    if (process.env.NODE_ENV === 'production') {
      window.onerror = function trackError(...args) {
        const json = {};
        args.forEach((arg, index) => {
          // we except strings as arguments or stringable object. toString ensures
          // things like functions won't cause problems with JSON.stringify
          json[index] = arg.toString();
        });
        const str = JSON.stringify(json, null, 2);
        track('Errors', 'Unhandled Exception', str);

        // rethrow the error :(
        throw new Error(args[0]);
      };
    }
  }

  render() {
    //set by webpack
    const DevTools = (process.env.DEBUG_REDUX) ? require('./DevTools') : 'noscript'; //eslint-disable-line global-require
    //todo - should we check this better
    const onLanding = this.props.location.pathname.indexOf('homepage') >= 0;
    const onProjectPage = this.props.location.pathname.indexOf('project/') >= 0;

    return (
      <div className="App">
        {!onLanding && <GlobalNav
          currentProjectId={this.props.currentProjectId}
          showMenu={onProjectPage}
        />}
        <RibbonGrunt atTop={onLanding} />
        <AuthenticationModals />
        <AboutForm />
        <ExtensionPicker />
        <ReportErrorModal />
        <div className="App-pageContent">
          {this.props.children}
        </div>
        <ModalSpinner spinMessage={this.props.spinMessage} />
        <InlineEditor />
        <DevTools />
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    currentProjectId: ownProps.params.projectId,
    spinMessage: state.ui.modals.spinMessage,
  };
}

export default connect(mapStateToProps)(App);
