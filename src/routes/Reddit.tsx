import * as React from 'react';
import { AppState } from '../state/AppState';

interface Props {
  appState: AppState;
}

export default class Reddit extends React.Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  render() {
    
    return (
      <div className="starter-template">
        <h1>Search Reddit</h1>
        <p className="lead">
          Find mentions of Steam games on Reddit in real time.
        </p>
        <div className="alert alert-info" role="alert">
          This functionality is coming soon. In the meantime, you can query this data in&nbsp;
          <a href="https://bigquery.cloud.google.com/dataset/hivemp:public" target="_blank" className="alert-link">
            Google BigQuery
          </a>
          &nbsp;directly.
        </div>
      </div>
    );
  }
}