export interface GoogleOAuthState {
  googleId?: string;
  tokenId?: string;
  accessToken?: string;
  tokenObj?: object;
  profileObj?: object;
  code?: object;
  error?: string;
  details?: string;
}