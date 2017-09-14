import * as React from 'react';
import { AppState } from '../state/AppState';
let google = require('googleapis');

interface Props {
  appState: AppState;
}

interface State {
  steamCuratorName: string;
  runningOperation: boolean;
}

export default class SteamCurators extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      steamCuratorName: '',
      runningOperation: false
    };
  }

  searchCurators(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (this.state.runningOperation) {
      return;
    }
    this.setState({runningOperation: true});
    this.searchCuratorsInternal()
      .then(() => {
        this.setState({runningOperation: false});
      })
      .catch((err) => {
        this.setState({runningOperation: false});
      });
    
  }

  async searchCuratorsInternal(): Promise<void> {
    // todo
    let bigquery = google.bigquery('v2');

    let authorize = (callback) => {
      if (this.props.appState.response === undefined ||
          this.props.appState.response.tokenObj === undefined) {
        return;
      }
      let authClient = google.auth.OAuth2();
      let tokenObj = this.props.appState.response.tokenObj as any;
      authClient.credentials = {
        access_token: tokenObj.access_token,
        refresh_token: false,
        expiry_date: tokenObj.expires_at,
      };
      callback(authClient);
    };
    
    await new Promise<void>((resolve, reject) => {
      authorize(function(authClient: any) {
        let request = {
          projectId: 'hivemp',
          resource: {

          },
          auth: authClient
        };

        bigquery.jobs.query(request, function(err: any, response: any) {
          if (err) {
            console.log(err);
            reject(err);
            return;
          }
          console.log(JSON.stringify(response, null, 2));
          resolve();
        });
      });
    });
  }

  render() {
    let searchPrefix: JSX.Element | null = null;
    if (this.state.runningOperation) {
      searchPrefix = <i className="fa fa-spin fa-spinner" />;
    }
    return (
      <div className="starter-template">
        <h1>Steam Curators</h1>
        <p className="lead">
          View trends of Steam curators over time.
        </p>
        <form
          className="input-group input-group-lg"
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => this.searchCurators(e)}
        >
          <input
            type="text"
            className="form-control"
            placeholder="Enter a Steam curator's name..."
            aria-label="Enter a Steam curator's name..."
            value={this.state.steamCuratorName}
            disabled={this.state.runningOperation}
            onChange={(e) => { this.setState({steamCuratorName: e.target.value }); }}
          />
          <span className="input-group-btn">
            <button
              className="btn btn-secondary"
              disabled={this.state.runningOperation}
              type="submit"
            >
              {searchPrefix} Search!
            </button>
          </span>
        </form>
      </div>
    );
  }
}