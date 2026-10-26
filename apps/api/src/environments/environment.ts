export const environment = {
  dbConnection: '',
  secretKey: '',
  // Origin the browser uses to reach the site, e.g. http://localhost:4200 or https://example.com.
  // Used for OAuth callback URLs and post-login redirects; https here also turns on Secure cookies.
  publicUrl: 'http://localhost:4200',
  // Leave a provider's keys blank to turn that sign-in option off.
  googleClientId: '',
  googleClientSecret: '',
  githubClientId: '',
  githubClientSecret: '',
  ik_endpoint: '',
  ik_publicKey: '',
  ik_privateKey: '',
  // TMDB v3 API key or v4 read access token; blank turns off the movie lookup in the editor.
  tmdbApiKey: ''
}
