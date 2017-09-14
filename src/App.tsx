import { GoogleOAuthState } from './GoogleOAuthState';
import * as React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './App.css';
import 'reactstrap';
import Home from './routes/Home';
import { Route } from 'react-router';
import { NavLink } from './components/NavLink';
import { AppState } from './state/AppState';
import LoginButton from './components/LoginButton';
import Reddit from './routes/Reddit';
import SteamCurators from './routes/SteamCurators';
import * as ls from 'local-storage';

// const logo = require('./logo.svg');

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);

    let responseJSON = ls.get('gauth');
    let r: GoogleOAuthState | undefined | null = undefined;
    if (responseJSON !== undefined) {
      r = JSON.parse(responseJSON) as GoogleOAuthState;
    }
    r = r || undefined;
    if (r !== undefined) {
      if ((r.tokenObj as any).expires_at <= Date.now()) {
        // Token has expired; requires re-auth.
        r = undefined;
      }
    }
    this.state = {
      response: r || undefined,
      loginCallback: (response: any) => {
        this.handleLogin(response);
      }
    };
  }

  handleLogin(response: any) {
    if (response.error) {
      return;
    }

    ls.set('gauth', JSON.stringify(response));
    this.setState({
      response: response
    });
  }

  render() {
    let links = [
      <NavLink key="home" to="/">Home</NavLink>
    ];
    let authedRoutes: JSX.Element[] = [];
    if (this.state.response !== undefined &&
        this.state.response.error === undefined) {
      links = [
        <NavLink key="home" to="/">Home</NavLink>,
        <NavLink key="curators" to="/steam/curators">Steam Curators</NavLink>,
        <NavLink key="reddit" to="/reddit">Reddit</NavLink>,
      ];
      authedRoutes = [
        (
          <Route
            key="curators"
            exact={true}
            path="/steam/curators"
            render={() => {
              return <SteamCurators appState={this.state} />;
            }}
          />
        ),
        (
          <Route
            key="reddit"
            exact={true}
            path="/reddit"
            render={() => {
              return <Reddit appState={this.state} />;
            }}
          />
        )
      ];
    }

    return (
      <div>
        <nav className="navbar navbar-expand-md navbar-dark bg-dark fixed-top">
          <a className="navbar-brand" href="#">HiveMP Open Data</a>
          <button
            className="navbar-toggler" 
            type="button" 
            data-toggle="collapse" 
            data-target="#navbarsExampleDefault" 
            aria-controls="navbarsExampleDefault" 
            aria-expanded="false" 
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="navbarsExampleDefault">
            <ul className="navbar-nav mr-auto">
              {links}
            </ul>
            <form className="form-inline my-2 my-lg-0">
              <LoginButton
                appState={this.state}
                className="btn btn-success btn-sm my-2 my-sm-0"
                text="Login"
              />
            </form>
          </div>
        </nav>
        <div className="container">
          <Route
            exact={authedRoutes.length > 0}
            path="/"
            render={() => {
              return <Home appState={this.state} />;
            }}
          />
          {authedRoutes}
        </div>
      </div>
    );
  }
}

export default App;
