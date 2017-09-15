import { QueryExecutor } from '../QueryExecutor';
import * as React from 'react';
import { AppState } from '../state/AppState';
import * as moment from 'moment';
var RC2 = require('react-chartjs2').default;

interface Props {
  appState: AppState;
  id: string;
}

interface State {
  curatorInfo?: any[];
  curatorOverTime?: any[];
  error?: string;
}

export default class SteamCuratorView extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      curatorInfo: undefined,
      curatorOverTime: undefined,
      error: undefined,
    };

    this.loadCuratorData(this.props.id)
      .catch((err) => {
        let errorString = (err || '').toString();
        if (err.result && err.result.error) {
          errorString = err.result.error.message;
        }
        this.setState({error: errorString});
      });
  }
  
  async loadCuratorData(id: string): Promise<void> {
    let executor = new QueryExecutor(this.props.appState);

    let curatorInfoPromise = executor.runQuery(
      `
SELECT
  id,
  url,
  name,
  description,
  avatarUrl,
  followers,
  negativeReviews,
  positiveReviews,
  informationalReviews,
  CASE lastReviewDate
    WHEN NULL THEN NULL
    ELSE UNIX_MILLIS(lastReviewDate)
  END AS lastReviewDate
FROM \`hivemp.public.SteamCurators_v2\`
WHERE _PARTITIONTIME = CAST(DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) AS TIMESTAMP)
  AND id = @id
LIMIT 1
`,
      [
        {
          name: 'id',
          parameterType: {
            type: 'INTEGER',
          },
          parameterValue: {
            value: parseInt(id, 10),
          }
        }
      ]
    );

    let curatorFollowersOverTimePromise = executor.runQuery(
      `
SELECT
  UNIX_MILLIS(date) AS date,
  followers,
  positiveReviews,
  negativeReviews,
  informationalReviews
FROM \`hivemp.public.SteamCurators_v2\`
WHERE id = @id
ORDER BY date ASC
`,
      [
        {
          name: 'id',
          parameterType: {
            type: 'INTEGER',
          },
          parameterValue: {
            value: parseInt(id, 10),
          }
        }
      ]
    );

    curatorInfoPromise.then((value) => {
      this.setState({curatorInfo: value});
    });
    curatorFollowersOverTimePromise.then((value) => {
      this.setState({curatorOverTime: value});
    });

    await curatorInfoPromise;
    await curatorFollowersOverTimePromise;
  }

  render() {
    let errorDialog: JSX.Element | null = null;
    if (this.state.error !== undefined) {
      errorDialog = (
        <div className="alert alert-danger" role="alert">
          {this.state.error}
        </div>
      );
    } else if (this.state.curatorInfo !== undefined && this.state.curatorInfo.length === 0) {
      return (
        <div className="starter-template">
          <div className="alert alert-danger" role="alert">
            The specified curator does not exist!
          </div>
        </div>
      );
    }

    let loadingNotice: JSX.Element | null = null;
    if ((this.state.curatorInfo === undefined || this.state.curatorOverTime === undefined) &&
        this.state.error === undefined) {
      loadingNotice = (
        <p className="mt-4">
          Please wait while information about this curator is loaded...
        </p>
      );
    }

    let header = <h1><i key="spinner" className="fa fa-spin fa-spinner" /> Loading curator #{this.props.id}</h1>;
    let info: JSX.Element[] | null = null;
    if (this.state.curatorInfo !== undefined) {
      header = <h1>{this.state.curatorInfo[0].name}</h1>;
      info = [
        (
          <div className="card mt-4">
            <div className="card-header">
              Curator Description
            </div>
            <div className="card-body">
              <p className="card-text">{this.state.curatorInfo[0].description.substr(0, 1000)}</p>
            </div>
          </div>
        ),
        (
          <div className="card-group mt-1">
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">Positive Reviews</h4>
                <p className="card-text">{this.state.curatorInfo[0].positiveReviews}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">Negative Reviews</h4>
                <p className="card-text">{this.state.curatorInfo[0].negativeReviews}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">Info Reviews</h4>
                <p className="card-text">{this.state.curatorInfo[0].informationalReviews}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">Last Review Date</h4>
                <p className="card-text">{
                  this.state.curatorInfo[0].lastReviewDate == null
                  ? '-' 
                  : (moment(this.state.curatorInfo[0].lastReviewDate as number)
                    .local().format('Do MMM YYYY, ha'))}</p>
              </div>
            </div>
          </div>
        )
      ];
    }
    let graphs1: JSX.Element[] | null = null;
    if (this.state.curatorOverTime !== undefined) {
      const nonstackedOptions = {
        maintainAspectRatio: false,
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true
            }
          }]
        },
        hover: {
          intersect: false,
          mode: 'nearest',
          animationDuration: 0,
        },
        tooltips: {
          mode: 'nearest',
          intersect: false,
        },
        animation: {
          duration: 0,
        },
        elements: {
          line: {
            lineTension: 0.2,
            cubicInterpolationMode: 'monotone',
          },
          point: {
            hitRadius: 10,
          }
        }
      };

      let dateLabels: string[] = [];
      let followersDataPoints: number[] = [];
      let positiveReviewsDataPoints: number[] = [];
      let negativeReviewsDataPoints: number[] = [];
      let informationalReviewsDataPoints: number[] = [];
      for (let i = 0; i < this.state.curatorOverTime.length; i++) {
        dateLabels[i] = moment(parseInt(this.state.curatorOverTime[i].date, 10)).format('MMM Do');
        followersDataPoints[i] = this.state.curatorOverTime[i].followers;
        positiveReviewsDataPoints[i] = this.state.curatorOverTime[i].positiveReviews;
        negativeReviewsDataPoints[i] = this.state.curatorOverTime[i].negativeReviews;
        informationalReviewsDataPoints[i] = this.state.curatorOverTime[i].informationalReviews;
      }

      const followersData = {
        labels: dateLabels,
        datasets: [
          {
            label: 'Followers',
            data: followersDataPoints,
            fill: false,
            backgroundColor: '#3c8dbc',
            borderColor: '#3c8dbc',
            pointRadius: 0
          }
        ]
      };

      const reviewsData = {
        labels: dateLabels,
        datasets: [
          {
            label: 'Positive Reviews',
            data: positiveReviewsDataPoints,
            fill: false,
            backgroundColor: '#00a65a',
            borderColor: '#00a65a',
            pointRadius: 0
          },
          {
            label: 'Informational Reviews',
            data: informationalReviewsDataPoints,
            fill: false,
            backgroundColor: '#f39c12',
            borderColor: '#f39c12',
            pointRadius: 0
          },
          {
            label: 'Negative Reviews',
            data: negativeReviewsDataPoints,
            fill: false,
            backgroundColor: '#f56954',
            borderColor: '#f56954',
            pointRadius: 0
          }
        ]
      };

      graphs1 = [
        (
          <div key="followers" className="card mt-1">
            <div className="card-body">
              <div className="chart" style={{position: 'relative', height: '40vh'}}>
                <RC2 type="line" name="rendered-chart" data={followersData} options={nonstackedOptions} />
              </div>
            </div>
          </div>
        ),
        (
          <div key="reviews" className="card mt-1">
            <div className="card-body">
              <div className="chart" style={{position: 'relative', height: '40vh'}}>
                <RC2 type="line" name="rendered-chart" data={reviewsData} options={nonstackedOptions} />
              </div>
            </div>
          </div>
        )
      ];
    }

    return (
      <div className="starter-template">
        {header}
        {info}
        {errorDialog}
        {graphs1}
        {loadingNotice}
      </div>
    );
  }
}