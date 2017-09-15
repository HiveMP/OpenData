import * as React from 'react';
import { AppState } from '../state/AppState';
import LoginButton from '../components/LoginButton';
import { Link } from 'react-router-dom';

interface Props {
  appState: AppState;
}

export default class Home extends React.Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  render() {
    let content: JSX.Element;
    if (this.props.appState.response !== undefined &&
        this.props.appState.response.error === undefined) {
      content = (
        <div className="row">
          <div className="col-sm-12 col-md-6">
            <div className="card">
              <div
                className="card-img-top card-icon"
                style={{backgroundColor: '#000000', color: 'white'}}
              >
                <i className="fa fa-steam" />
              </div>
              <div className="card-body">
                <h4 className="card-title">Steam Curators</h4>
                <p className="card-text">View trends of Steam Curators over time.</p>
                <Link to="/steam/curators" className="btn btn-primary">Search now</Link>
              </div>
            </div>
          </div>
          <div className="col-sm-12 col-md-6">
            <div className="card">
              <div
                className="card-img-top card-icon"
                style={{backgroundColor: 'white', color: '#ff4500'}}
              >
                <i className="fa fa-reddit" />
              </div>
              <div className="card-body">
                <h4 className="card-title">Reddit</h4>
                <p className="card-text">Search for mentions of games on Reddit in real-time.</p>
                <Link to="/reddit" className="btn btn-primary">Search now</Link>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      content = (
        <p className="lead">
          <LoginButton
            appState={this.props.appState}
            className="btn btn-success btn-primary my-2 my-sm-0"
            text="Login with Google to get started"
          />
        </p>
      );
    }
    return (
      <div className="starter-template">
        <h1>HiveMP Open Data</h1>
        <p className="lead">
          View trends and analyse public gaming data.
        </p>
        {content}
      </div>
    );
  }
}