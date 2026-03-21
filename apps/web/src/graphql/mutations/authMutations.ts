import { gql } from '@apollo/client';

// Login mutation
export const LOGIN = gql`
  mutation Login($email: String!, $password: String!, $rememberMe: Boolean) {
    login(email: $email, password: $password, rememberMe: $rememberMe) {
      success
      message
      user {
        id
        email
        username
        firstName
        lastName
        avatar
        isVerified
      }
      tokens {
        accessToken
        refreshToken
        expiresIn
      }
      requiresTwoFactor
      twoFactorToken
    }
  }
`;

// Register mutation
export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      success
      message
      user {
        id
        email
        username
        firstName
        lastName
      }
      verificationRequired
      verificationToken
    }
  }
`;

// Logout mutation
export const LOGOUT = gql`
  mutation Logout($allDevices: Boolean) {
    logout(allDevices: $allDevices) {
      success
      message
    }
  }
`;

// Refresh token mutation
export const REFRESH_TOKEN = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      success
      tokens {
        accessToken
        refreshToken
        expiresIn
      }
    }
  }
`;

// Verify email mutation
export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      success
      message
      user {
        id
        isVerified
      }
    }
  }
`;

// Resend verification email
export const RESEND_VERIFICATION = gql`
  mutation ResendVerification($email: String!) {
    resendVerificationEmail(email: $email) {
      success
      message
    }
  }
`;

// Forgot password mutation
export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email) {
      success
      message
    }
  }
`;

// Reset password mutation
export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword) {
      success
      message
    }
  }
`;

// Change password mutation
export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      message
    }
  }
`;

// Two-factor authentication setup
export const SETUP_TWO_FACTOR = gql`
  mutation SetupTwoFactor {
    setupTwoFactor {
      success
      secret
      qrCodeUrl
      backupCodes
    }
  }
`;

// Enable two-factor authentication
export const ENABLE_TWO_FACTOR = gql`
  mutation EnableTwoFactor($code: String!) {
    enableTwoFactor(code: $code) {
      success
      message
    }
  }
`;

// Disable two-factor authentication
export const DISABLE_TWO_FACTOR = gql`
  mutation DisableTwoFactor($code: String!) {
    disableTwoFactor(code: $code) {
      success
      message
    }
  }
`;

// Verify two-factor code
export const VERIFY_TWO_FACTOR = gql`
  mutation VerifyTwoFactor($code: String!, $twoFactorToken: String) {
    verifyTwoFactor(code: $code, twoFactorToken: $twoFactorToken) {
      success
      user {
        id
        email
        username
        firstName
        lastName
        avatar
      }
      tokens {
        accessToken
        refreshToken
        expiresIn
      }
    }
  }
`;

// OAuth login
export const OAUTH_LOGIN = gql`
  mutation OAuthLogin($provider: OAuthProvider!, $code: String!, $state: String) {
    oauthLogin(provider: $provider, code: $code, state: $state) {
      success
      user {
        id
        email
        username
        firstName
        lastName
        avatar
        isVerified
      }
      tokens {
        accessToken
        refreshToken
        expiresIn
      }
      isNewUser
    }
  }
`;

// Update user settings
export const UPDATE_SETTINGS = gql`
  mutation UpdateSettings($input: UserSettingsInput!) {
    updateSettings(input: $input) {
      success
      message
      settings {
        id
        theme
        language
        notificationsEnabled
        emailNotifications
        pushNotifications
        privacyLevel
        profileVisibility
        showOnlineStatus
        showLastSeen
      }
    }
  }
`;

// Deactivate account
export const DEACTIVATE_ACCOUNT = gql`
  mutation DeactivateAccount($password: String!, $reason: String) {
    deactivateAccount(password: $password, reason: $reason) {
      success
      message
    }
  }
`;

// Delete account
export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($password: String!) {
    deleteAccount(password: $password) {
      success
      message
    }
  }
`;

// Update profile
export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      success
      message
      user {
        id
        firstName
        lastName
        bio
        location
        workplace
        education
        relationshipStatus
        birthDate
        gender
        avatar
        coverPhoto
      }
    }
  }
`;
