import * as React from 'react';
import { AppState } from '../state/AppState';
import * as moment from 'moment';

interface Props {
  appState: AppState;
}

interface State {
  steamCuratorName: string;
  runningTopOperation: boolean;
  runningOperation: boolean;
  error?: string;
  searchResults?: SearchResult[];
  topSearchResults?: SearchResult[];
}

interface SearchResult {
  id: string;
  name: string;
  followers: number;
  totalReviews: number;
  percentFavourable: number;
  lastReviewDate: number | null;
}

export default class SteamCurators extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      steamCuratorName: '',
      runningTopOperation: true,
      runningOperation: false,
      error: undefined,
      searchResults: undefined,
    };

    this.searchTopCuratorsInternal()
      .then(() => {
        this.setState({runningTopOperation: false});
      })
      .catch((err) => {
        let errorString = (err || '').toString();
        if (err.result && err.result.error) {
          errorString = err.result.error.message;
        }
        this.setState({error: errorString, runningTopOperation: false});
      });
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
        let errorString = (err || '').toString();
        if (err.result && err.result.error) {
          errorString = err.result.error.message;
        }
        this.setState({error: errorString, runningOperation: false});
      });
  }
  
    async searchTopCuratorsInternal(): Promise<void> {
      this.setState({ topSearchResults: await this.runSearchQuery(
        `
  SELECT
    id,
    name,
    followers,
    negativeReviews,
    positiveReviews,
    CASE lastReviewDate
      WHEN NULL THEN NULL
      ELSE UNIX_MILLIS(lastReviewDate)
    END AS lastReviewDateUnixMillis
  FROM (
    SELECT
      id,
      name,
      followers,
      negativeReviews,
      positiveReviews,
      lastReviewDate,
      ROW_NUMBER() OVER(PARTITION BY id ORDER BY date) AS firstCreated
    FROM \`hivemp.public.SteamCurators_v2\`
    WHERE _PARTITIONTIME = CAST(CURRENT_DATE() AS TIMESTAMP)
  )
  WHERE firstCreated = 1
  ORDER BY followers DESC
  LIMIT 100`,
        []) });
    }

  async searchCuratorsInternal(): Promise<void> {
    if (this.state.steamCuratorName.length < 3) {
      throw 'Your search query must be at least 3 characters long.';
    }

    this.setState({ searchResults: await this.runSearchQuery(
      `
SELECT
  id,
  name,
  followers,
  negativeReviews,
  positiveReviews,
  CASE lastReviewDate
    WHEN NULL THEN NULL
    ELSE UNIX_MILLIS(lastReviewDate)
  END AS lastReviewDateUnixMillis
FROM (
  SELECT
    id,
    name,
    followers,
    negativeReviews,
    positiveReviews,
    lastReviewDate,
    ROW_NUMBER() OVER(PARTITION BY id ORDER BY date) AS firstCreated
  FROM \`hivemp.public.SteamCurators_v2\`
  WHERE _PARTITIONTIME = CAST(CURRENT_DATE() AS TIMESTAMP)
    AND name LIKE @input
)
WHERE firstCreated = 1
ORDER BY followers DESC
LIMIT 250`,
      [
        {
          name: 'input',
          parameterType: {
            type: 'STRING',
          },
          parameterValue: {
            value: '%' + this.state.steamCuratorName + '%',
          }
        }
      ]) });
  }

  async runSearchQuery(query: string, queryParameters: any): Promise<SearchResult[]> {
    let gapi = await require('google-client-api')();
    await gapi.client.init({
      'apiKey': 'AIzaSyDZbMZWkWTmhToK1xtc5X7SwUufr-eSx0k',
      'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/bigquery/v2/rest'],
    });
    if (this.props.appState.response === undefined ||
        this.props.appState.response.tokenObj === undefined) {
      return [];
    }
    let tokenObj = this.props.appState.response.tokenObj as any;
    gapi.auth.setToken({
      access_token: tokenObj.access_token
    });

    let projectResult = await gapi.client.bigquery.projects.list(
      {
        maxResults: 1,
      });
    let projectId = projectResult.result.projects[0].id;

    let queryResult = await gapi.client.bigquery.jobs.query(
      {
        projectId: projectId,
        resource: {
          query: query,
          useLegacySql: false,
          queryParameters: queryParameters
        },
      });

    let searchResults: SearchResult[] = [];
    for (let i = 0; i < queryResult.result.totalRows; i++) {
      let id = queryResult.result.rows[i].f[0].v as string;
      let name = queryResult.result.rows[i].f[1].v as string;
      let followers = parseInt(queryResult.result.rows[i].f[2].v as string, 10);
      let negativeReviews = parseInt(queryResult.result.rows[i].f[3].v as string, 10);
      let positiveReviews = parseInt(queryResult.result.rows[i].f[4].v as string, 10);
      let lastReviewDate = 
        queryResult.result.rows[i].f[5].v == null ? null : parseInt(queryResult.result.rows[i].f[5].v as string, 10);
      let totalReviews = negativeReviews + positiveReviews;
      let percentFavourable = 1;
      if (totalReviews > 0) {
        percentFavourable = positiveReviews / totalReviews;
      }
      searchResults.push({
        id: id,
        name: name,
        followers: followers,
        totalReviews: totalReviews,
        percentFavourable: percentFavourable,
        lastReviewDate: lastReviewDate,
      });
    }
    return searchResults;
  }

  render() {
    let searchTerm: any[] = [ 'Search!' ];
    if (this.state.runningOperation) {
      searchTerm = [
        <i key="spinner" className="fa fa-spin fa-spinner" />,
        ' Searching...'
      ];
    }

    let errorDialog: JSX.Element | null = null;
    if (this.state.error !== undefined) {
      errorDialog = (
        <div className="alert alert-danger" role="alert">
          {this.state.error}
        </div>
      );
    }

    let searchResults: JSX.Element[] | JSX.Element | null = null;
    let searchData = this.state.searchResults || this.state.topSearchResults;
    if (searchData == null) {
      if (this.state.runningTopOperation) {
        searchResults = (
          <p className="lead">
            <i className="fa fa-spin fa-spinner" /> Loading top 100 curators...
          </p>
        );
      }
    } else {
      if (searchData.length === 0) {
        searchResults = (
          <p className="lead">
            No matching curators were found. Only curators with at least 10 followers are tracked.
          </p>
        );
      } else {
        let rows: JSX.Element[] = [];
        for (let i = 0; i < searchData.length; i++) {
          let value = searchData[i].percentFavourable;
          let hue = (value * 120).toString(10);
          let backgroundColor = ['hsl(', hue, ',100%,90%)'].join('');
          rows.push(
            <tr>
              <th scope="row" className="d-none d-md-table-cell">{searchData[i].id}</th>
              <td>{searchData[i].name}</td>
              <td>{searchData[i].followers}</td>
              <td>{searchData[i].totalReviews}</td>
              <td className="d-none d-lg-table-cell" style={{backgroundColor: backgroundColor}}>
                {Math.round(searchData[i].percentFavourable * 10000) / 100}%
              </td>
              <td className="text-nowrap d-none d-lg-table-cell">{
                searchData[i].lastReviewDate == null
                ? '-' 
                : (moment(searchData[i].lastReviewDate as number)
                  .local().format('Do MMM YYYY, ha'))}</td>
            </tr>
          );
        }
        let lenIndicator = searchData.length.toString();
        let lenSuffix = 'found';
        if (searchData.length >= 250) {
          lenIndicator = 'More than 250';
        }
        if (this.state.topSearchResults !== undefined && this.state.searchResults === undefined) {
          lenIndicator = 'Top 100';
          lenSuffix = 'shown';
        }
        searchResults = [
          (
            <p key="summary" className="lead">
              {lenIndicator} curators {lenSuffix}.
            </p>
          ),
          (
            <table key="data" className="table">
              <thead>
                <tr>
                  <th className="d-none d-md-table-cell">ID</th>
                  <th>Name</th>
                  <th className="text-nowrap">Followers</th>
                  <th className="text-nowrap">Total Reviews</th>
                  <th className="text-nowrap d-none d-lg-table-cell">% Favourable</th>
                  <th className="text-nowrap d-none d-lg-table-cell">Last Review</th>
                </tr>
              </thead>
              <tbody>
                {rows}
              </tbody>
            </table>
          )
        ];
      }
    }

    return (
      <div className="starter-template">
        <h1>Steam Curators</h1>
        <p className="lead">
          View trends of Steam curators over time.
        </p>
        {errorDialog}
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
              {searchTerm}
            </button>
          </span>
        </form>
        <p />
        {searchResults}
      </div>
    );
  }
}