/**
 * OAuth Service
 * Handles OAuth authentication with various providers
 */

// Supported OAuth Providers
export type OAuthProvider = 'google' | 'facebook' | 'apple' | 'twitter' | 'github';

// OAuth Configuration
export interface OAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  facebook: {
    appId: string;
    appSecret: string;
    redirectUri: string;
  };
  apple: {
    clientId: string;
    teamId: string;
    keyId: string;
    privateKey: string;
    redirectUri: string;
  };
  twitter: {
    consumerKey: string;
    consumerSecret: string;
    callbackUrl: string;
  };
  github: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
}

// OAuth Profile from providers
export interface OAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  verified?: boolean;
  rawProfile?: Record<string, unknown>;
}

// OAuth Service Class
export class OAuthService {
  private config: Partial<OAuthConfig>;

  constructor(config: Partial<OAuthConfig> = {}) {
    this.config = config;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(provider: OAuthProvider, state?: string): string {
    switch (provider) {
      case 'google':
        return this.getGoogleAuthUrl(state);
      case 'facebook':
        return this.getFacebookAuthUrl(state);
      case 'apple':
        return this.getAppleAuthUrl(state);
      case 'twitter':
        return this.getTwitterAuthUrl(state);
      case 'github':
        return this.getGithubAuthUrl(state);
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    provider: OAuthProvider,
    code: string,
    state?: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    switch (provider) {
      case 'google':
        return this.exchangeGoogleCode(code);
      case 'facebook':
        return this.exchangeFacebookCode(code);
      case 'apple':
        return this.exchangeAppleCode(code);
      case 'twitter':
        return this.exchangeTwitterCode(code);
      case 'github':
        return this.exchangeGithubCode(code);
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }

  /**
   * Get user profile from OAuth provider
   */
  async getProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
    switch (provider) {
      case 'google':
        return this.getGoogleProfile(accessToken);
      case 'facebook':
        return this.getFacebookProfile(accessToken);
      case 'apple':
        return this.getAppleProfile(accessToken);
      case 'twitter':
        return this.getTwitterProfile(accessToken);
      case 'github':
        return this.getGithubProfile(accessToken);
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }

  // Private methods for each provider
  private getGoogleAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.google?.clientId || '',
      redirect_uri: this.config.google?.redirectUri || '',
      response_type: 'code',
      scope: 'openid email profile',
      state: state || '',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private getFacebookAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.facebook?.appId || '',
      redirect_uri: this.config.facebook?.redirectUri || '',
      response_type: 'code',
      scope: 'email,public_profile',
      state: state || '',
    });
    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  private getAppleAuthUrl(state?: string): string {
    // Apple Sign In uses different flow
    throw new Error('Apple Sign In requires client-side implementation');
  }

  private getTwitterAuthUrl(state?: string): string {
    // Twitter OAuth 2.0
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.twitter?.consumerKey || '',
      redirect_uri: this.config.twitter?.callbackUrl || '',
      scope: 'tweet.read users.read email',
      state: state || '',
      code_challenge: 'challenge',
      code_challenge_method: 'plain',
    });
    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }

  private getGithubAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.github?.clientId || '',
      redirect_uri: this.config.github?.callbackUrl || '',
      scope: 'user:email',
      state: state || '',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  // Exchange methods (implementations would call provider APIs)
  private async exchangeGoogleCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    // Implementation would call Google's token endpoint
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.google?.clientId || '',
        client_secret: this.config.google?.clientSecret || '',
        redirect_uri: this.config.google?.redirectUri || '',
        grant_type: 'authorization_code',
      }),
    });
    return response.json();
  }

  private async exchangeFacebookCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: this.config.facebook?.appId || '',
        client_secret: this.config.facebook?.appSecret || '',
        redirect_uri: this.config.facebook?.redirectUri || '',
        code,
      })
    );
    return response.json();
  }

  private async exchangeAppleCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    // Apple requires JWT client secret
    throw new Error('Apple token exchange requires JWT client secret generation');
  }

  private async exchangeTwitterCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.config.twitter?.consumerKey}:${this.config.twitter?.consumerSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.twitter?.callbackUrl || '',
        code_verifier: 'challenge',
      }),
    });
    return response.json();
  }

  private async exchangeGithubCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.github?.clientId,
        client_secret: this.config.github?.clientSecret,
        code,
        redirect_uri: this.config.github?.callbackUrl,
      }),
    });
    return response.json();
  }

  // Profile fetching methods
  private async getGoogleProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    return {
      provider: 'google',
      providerUserId: data.id,
      email: data.email,
      firstName: data.given_name,
      lastName: data.family_name,
      avatar: data.picture,
      verified: data.verified_email,
      rawProfile: data,
    };
  }

  private async getFacebookProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,email,first_name,last_name,picture,verified`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();
    return {
      provider: 'facebook',
      providerUserId: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      avatar: data.picture?.data?.url,
      verified: data.verified,
      rawProfile: data,
    };
  }

  private async getAppleProfile(accessToken: string): Promise<OAuthProfile> {
    // Apple profile comes from ID token
    throw new Error('Apple profile requires ID token parsing');
  }

  private async getTwitterProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=name,profile_image_url,verified', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    return {
      provider: 'twitter',
      providerUserId: data.data.id,
      email: '', // Twitter doesn't always provide email
      firstName: data.data.name,
      avatar: data.data.profile_image_url,
      verified: data.data.verified,
      rawProfile: data,
    };
  }

  private async getGithubProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    return {
      provider: 'github',
      providerUserId: String(data.id),
      email: data.email,
      firstName: data.name?.split(' ')[0],
      lastName: data.name?.split(' ').slice(1).join(' '),
      avatar: data.avatar_url,
      verified: true,
      rawProfile: data,
    };
  }
}

export const oauthService = new OAuthService();
