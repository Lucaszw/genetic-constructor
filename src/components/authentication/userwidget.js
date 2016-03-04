import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import {pushState} from 'redux-router';
import PopupMenu from '../../components/Menu/PopupMenu';
import Vector2D from '../../containers/graphics/geometry/vector2d';
import { connect } from 'react-redux';
import 'isomorphic-fetch';
import { uiShowAuthenticationForm, uiSetGrunt } from '../../actions/ui';
import { userSetUser } from '../../actions/user';

import '../../styles/userwidget.css';

class UserWidget extends Component {

  static propTypes = {
    uiShowAuthenticationForm: PropTypes.func.isRequired,
    uiSetGrunt: PropTypes.func.isRequired,
    userSetUser: PropTypes.func.isRequired,
    user: PropTypes.object,
  };

  constructor() {
    super();
    this.state = {
      menuOpen: false,
      menuPosition: new Vector2D(),
    };
  }

  onSignIn(evt) {
    evt.preventDefault();
    this.props.uiShowAuthenticationForm('signin');
  }

  onShowMenu() {
    const b = ReactDOM.findDOMNode(this).getBoundingClientRect();
    this.setState({
      menuOpen: true,
      menuPosition: new Vector2D(b.left - 200, b.top + b.height),
    });
  }

  closeMenu() {
    this.setState({
      menuOpen: false,
    });
  }

  signOut() {

    const endPoint = `${window.location.origin}/auth/logout`;

    fetch(endPoint, {
      credentials: 'include',
      method: 'GET',
    })
    .then(() => {
      // set the user
      this.props.userSetUser({
        userid: null,
        email: null,
        firstName: null,
        lastName: null,
      });
      // show a grunt
      this.props.uiSetGrunt('Your are now signed out');
      this.props.pushState(null, '/auth/signin');
    })
    .catch((reason) => {
      this.props.uiSetGrunt('There was a problem signing you out');
    });

  }

  contextMenu() {
    return (<PopupMenu
      open={this.state.menuOpen}
      position={this.state.menuPosition}
      closePopup={this.closeMenu.bind(this)}
      menuItems={
        [
          {
            text: <b>{`${this.props.user.firstName} ${this.props.user.lastName}`}</b>,
          },
          {
            text: 'My Account',
            action: () => {
              this.props.uiShowAuthenticationForm('account');
            },
          },
          {
            text: 'Sign Out',
            action: this.signOut.bind(this)
          },
        ]
      }/>);
  }

  render() {
    if (this.props.user.userid) {
      // signed in user
      return (
        <div className="userwidget">
          <div onClick={this.onShowMenu.bind(this)} className="signed-in">{this.props.user.firstName.substr(0, 1)}</div>
          {this.contextMenu()}
        </div>
      )
    }
    // signed out user
    return (
      <div className="userwidget">
        <a href="#" className="signed-out" onClick={this.onSignIn.bind(this)}>SIGN IN</a>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    user: state.user,
  };
}
export default connect(mapStateToProps, {
  uiShowAuthenticationForm,
  uiSetGrunt,
  userSetUser,
  pushState,
})(UserWidget);
