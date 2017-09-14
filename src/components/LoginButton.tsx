import { AppState } from '../state/AppState';
import * as React from 'react';
import GoogleLogin from 'react-google-login';

interface Props {
  appState: AppState;
  className: string;
  text: string;
}

export default class LoginButton extends React.Component<Props, {}> {
  render() {
    if (this.props.appState.response !== undefined &&
        this.props.appState.response.error === undefined) {
      return null;
    }
    return (
      <GoogleLogin
        clientId="284503900416-hefob55l3r54pir34hdpanuom9e2207k.apps.googleusercontent.com"
        scope="profile email https://www.googleapis.com/auth/bigquery"
        onSuccess={this.props.appState.loginCallback}
        onFailure={this.props.appState.loginCallback}
        className={this.props.className}
        tag="button"
      >
        {this.props.text}
      </GoogleLogin>
    );
  }
}