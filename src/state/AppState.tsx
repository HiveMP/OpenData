import { GoogleOAuthState } from '../GoogleOAuthState';

export interface AppState {
  response?: GoogleOAuthState;
  loginCallback: (response: any) => void;
}