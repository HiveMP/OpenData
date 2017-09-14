import * as React from 'react';
import { AppState } from '../state/AppState';
import LoginButton from '../components/LoginButton';

interface Props {
  appState: AppState;
}

export default class Home extends React.Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  render() {
    
    return (
      <div className="starter-template">
        <h1>HiveMP Open Data</h1>
        <p className="lead">
          View trends and analyse public gaming data.
        </p>
        <p className="lead">
          <LoginButton
            appState={this.props.appState}
            className="btn btn-success btn-primary my-2 my-sm-0"
            text="Login with Google to get started"
          />
          </p>
      </div>
    );
  }
}