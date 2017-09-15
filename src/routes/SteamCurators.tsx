import { QueryExecutor } from '../QueryExecutor';
import * as React from 'react';
import { AppState } from '../state/AppState';
import * as moment from 'moment';
import { Link } from 'react-router-dom';

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
  negativeReviews: number;
  positiveReviews: number;
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
      let executor = new QueryExecutor(this.props.appState);
      this.setState({ topSearchResults: await executor.runQuery(
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
    END AS lastReviewDate
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
    WHERE _PARTITIONTIME = CAST(DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) AS TIMESTAMP)
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

    let executor = new QueryExecutor(this.props.appState);
    this.setState({ searchResults: await executor.runQuery(
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
  END AS lastReviewDate
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
  WHERE _PARTITIONTIME = CAST(DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) AS TIMESTAMP)
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
          let totalReviews = searchData[i].negativeReviews + searchData[i].positiveReviews;
          let percentFavourable = 1;
          if (totalReviews > 0) {
            percentFavourable = searchData[i].positiveReviews / totalReviews;
          }
          let favourHue = (percentFavourable * 120).toString(10);
          let favourColor = ['hsl(', favourHue, ',100%,90%)'].join('');
          let reviewColor = 'white';
          if (searchData[i].lastReviewDate != null) {
            let lastReviewUtc = moment(searchData[i].lastReviewDate as number).unix();
            let currentTimeUtc = moment().unix();
            let monthSeconds = 60 * 60 * 24 * 30;
            let age = Math.max(0, Math.min(currentTimeUtc - lastReviewUtc, monthSeconds));
            let reviewHue = ((1 - (age / monthSeconds)) * 120).toString(10);
            reviewColor = ['hsl(', reviewHue, ',100%,90%)'].join('');
          }
          
          rows.push(
            <tr>
              <td className="align-middle">
                <Link to={'/steam/curators/' + searchData[i].id} className="btn btn-primary btn-sm">
                  <i className="fa fa-bar-chart" />
                </Link>
              </td>
              <td className="align-middle">{searchData[i].name}</td>
              <td className="align-middle">{searchData[i].followers}</td>
              <td className="align-middle">{searchData[i].negativeReviews + searchData[i].positiveReviews}</td>
              <td className="d-none d-lg-table-cell align-middle" style={{backgroundColor: favourColor}}>
                {Math.round(percentFavourable * 10000) / 100}%
              </td>
              <td className="text-nowrap d-none d-lg-table-cell align-middle" style={{backgroundColor: reviewColor}}>{
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
                  <th />
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