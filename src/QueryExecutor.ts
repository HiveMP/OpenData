import { AppState } from './state/AppState';

export class QueryExecutor {
  private appState: AppState;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  async runQuery(query: string, queryParameters: any): Promise<any[]> {
    let gapi = await require('google-client-api')();
    await gapi.client.init({
      'apiKey': 'AIzaSyDZbMZWkWTmhToK1xtc5X7SwUufr-eSx0k',
      'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/bigquery/v2/rest'],
    });
    if (this.appState.response === undefined ||
        this.appState.response.tokenObj === undefined) {
      return [];
    }
    let tokenObj = this.appState.response.tokenObj as any;
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

    console.log(queryResult);

    let results: any[] = [];
    for (let i = 0; i < queryResult.result.totalRows; i++) {
      let result: any = {};
      let row = queryResult.result.rows[i];
      for (let f = 0; f < queryResult.result.schema.fields.length; f++) {
        let fieldInfo = queryResult.result.schema.fields[f];
        if (row.f[f].v == null) {
          result[fieldInfo.name] = null;
        } else {
          switch (fieldInfo.type) {
            case 'INTEGER':
              result[fieldInfo.name] = parseInt(row.f[f].v as string, 10);
              break;
            case 'STRING':
              result[fieldInfo.name] = row.f[f].v as string;
              break;
            default:
              // Unsupported type.
              break;
          }
        }
      }
      results.push(result);
    }
    return results;
  }
}