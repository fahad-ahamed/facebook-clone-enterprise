'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  Calendar,
  MapPin,
  CheckCircle,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { COUNTRIES } from '@/types';

// Types
interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (data: RegisterData) => Promise<RegisterResult>;
  onVerifyEmail?: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  onForgotPassword?: (email: string) => Promise<{ success: boolean; code?: string; error?: string }>;
  onResetPassword?: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  onResendCode?: (email: string, type: 'verification' | 'reset') => Promise<{ success: boolean; code?: string; error?: string }>;
  loading?: boolean;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
}

interface RegisterResult {
  success: boolean;
  verificationCode?: string;
  emailSent?: boolean;
  error?: string;
}

// Validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

// Login Form Component
function LoginForm({
  onSubmit,
  onForgotPassword,
  onSwitchToRegister,
  loading,
  error: externalError,
}: {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  onSwitchToRegister: () => void;
  loading?: boolean;
  error?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    // Validate email
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loading || submitting;
  const displayError = externalError || error;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-xl border border-gray-100">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[#1877F2] mb-2">facebook</h1>
          <p className="text-gray-500 text-sm">
            Connect with friends and the world around you.
          </p>
        </div>

        {displayError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              disabled={isLoading}
              className={cn(
                'h-12 pl-10 transition-all duration-200',
                emailError && 'border-red-500 focus-visible:ring-red-500'
              )}
              required
            />
            {emailError && (
              <p className="text-red-500 text-xs mt-1 ml-1">{emailError}</p>
            )}
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full h-12 text-base font-semibold transition-all duration-200',
              'bg-[#1877F2] hover:bg-[#166FE5] text-white'
            )}
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              'Log In'
            )}
          </Button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-[#1877F2] hover:underline font-medium"
          >
            Forgot password?
          </button>
        </div>

        <Separator className="my-6" />

        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            onClick={onSwitchToRegister}
            className="bg-[#42B72A] hover:bg-[#36A420] text-white border-0 h-12 px-8 text-base font-semibold transition-all duration-200"
          >
            Create New Account
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-4">
        By continuing, you agree to our{' '}
        <a href="#" className="text-[#1877F2] hover:underline">Terms of Service</a>
        {' '}and{' '}
        <a href="#" className="text-[#1877F2] hover:underline">Privacy Policy</a>.
      </p>
    </div>
  );
}

// Register Form Component
function RegisterForm({
  onSubmit,
  onSwitchToLogin,
  loading,
}: {
  onSubmit: (data: RegisterData) => Promise<RegisterResult>;
  onSwitchToLogin: () => void;
  loading?: boolean;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';

    if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.message || 'Invalid password';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const result = await onSubmit({
        firstName,
        lastName,
        email,
        password,
        dateOfBirth,
        gender,
        country,
      });

      if (!result.success) {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loading || submitting;

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-xl border border-gray-100">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Sign Up</h1>
          <p className="text-gray-500 text-sm">It&apos;s quick and easy.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, firstName: '' }));
                  }}
                  disabled={isLoading}
                  className={cn(
                    'h-11 pl-10',
                    fieldErrors.firstName && 'border-red-500'
                  )}
                  required
                />
              </div>
              {fieldErrors.firstName && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
              )}
            </div>
            <div>
              <Input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, lastName: '' }));
                }}
                disabled={isLoading}
                className={cn(
                  'h-11',
                  fieldErrors.lastName && 'border-red-500'
                )}
                required
              />
              {fieldErrors.lastName && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((prev) => ({ ...prev, email: '' }));
              }}
              disabled={isLoading}
              className={cn(
                'h-11 pl-10',
                fieldErrors.email && 'border-red-500'
              )}
              required
            />
          </div>
          {fieldErrors.email && (
            <p className="text-red-500 text-xs -mt-2">{fieldErrors.email}</p>
          )}

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: '' }));
              }}
              disabled={isLoading}
              className={cn(
                'h-11 pl-10 pr-10',
                fieldErrors.password && 'border-red-500'
              )}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-red-500 text-xs -mt-2">{fieldErrors.password}</p>
          )}

          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              disabled={isLoading}
              className={cn(
                'h-11 pl-10',
                fieldErrors.confirmPassword && 'border-red-500'
              )}
              required
            />
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-red-500 text-xs -mt-2">{fieldErrors.confirmPassword}</p>
          )}

          {/* DOB and Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium">Date of birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  disabled={isLoading}
                  className="h-11 pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="custom">Custom</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-medium">Country</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 border border-gray-300 rounded-md pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500 leading-relaxed">
            People who use our service may have uploaded your contact information to Facebook.{' '}
            <a href="#" className="text-[#1877F2] hover:underline">
              Learn more
            </a>
            .
          </p>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#42B72A] hover:bg-[#36A420] text-white text-base font-semibold transition-all duration-200"
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign Up'}
          </Button>
        </form>

        <Separator className="my-6" />

        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#1877F2] hover:underline font-medium"
          >
            Already have an account?
          </button>
        </div>
      </div>
    </div>
  );
}

// Verification Code Component
function VerificationScreen({
  email,
  verificationCode,
  emailSent,
  onVerify,
  onResend,
  onBack,
  loading,
}: {
  email: string;
  verificationCode?: string;
  emailSent?: boolean;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  loading?: boolean;
}) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onVerify(code);
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  };

  const isLoading = loading || submitting;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-xl border border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Confirm your email</h2>
          <p className="text-gray-500 text-sm">
            We sent a verification code to<br />
            <strong className="text-gray-900">{email}</strong>
          </p>
        </div>

        {/* Email sent indicator */}
        {emailSent ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>Email sent! Check your inbox.</span>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Demo Mode:</strong> Your code is:{' '}
              <strong className="font-mono text-lg">{verificationCode}</strong>
            </span>
          </div>
        )}

        {/* OTP Input */}
        <div className="flex justify-center mb-4">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => {
              setCode(value);
              setError('');
            }}
            disabled={isLoading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <Button
          onClick={handleVerify}
          disabled={isLoading || code.length !== 6}
          className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold transition-all duration-200"
        >
          {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify'}
        </Button>

        <div className="text-center mt-4">
          <p className="text-gray-500 text-sm">
            Did&apos;t receive the code?{' '}
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-[#1877F2] hover:underline font-medium disabled:opacity-50 flex items-center gap-1 justify-center"
            >
              {resending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Resend
                </>
              )}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Forgot Password Flow
function ForgotPasswordModal({
  open,
  onClose,
  onSendCode,
  onVerifyCode,
  onResetPassword,
}: {
  open: boolean;
  onClose: () => void;
  onSendCode: (email: string) => Promise<{ success: boolean; code?: string; emailSent?: boolean }>;
  onVerifyCode: (email: string, code: string) => Promise<{ success: boolean }>;
  onResetPassword: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentCode, setSentCode] = useState<string | undefined>();
  const [emailSent, setEmailSent] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSendCode = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await onSendCode(email);
      if (result.success) {
        setSentCode(result.code);
        setEmailSent(result.emailSent ?? false);
        setStep('code');
      } else {
        setError('Failed to send reset code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await onVerifyCode(email, code);
      if (result.success) {
        setStep('password');
      } else {
        setError('Invalid verification code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.message || 'Invalid password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await onResetPassword(email, code, newPassword);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          resetState();
        }, 2000);
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSentCode(undefined);
    setEmailSent(false);
    setSuccess(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'email' && 'Find Your Account'}
            {step === 'code' && 'Enter Security Code'}
            {step === 'password' && 'Create New Password'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email' && 'Enter your email to reset your password.'}
            {step === 'code' && 'We sent a code to your email.'}
            {step === 'password' && 'Create a strong password for your account.'}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-gray-700">Password reset successfully! Redirecting...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 'email' && (
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    className="h-11 pl-10"
                  />
                </div>
                <Button
                  onClick={handleSendCode}
                  disabled={loading}
                  className="w-full h-11 bg-[#1877F2] hover:bg-[#166FE5]"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Continue'}
                </Button>
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-4">
                {emailSent ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Email sent! Check your inbox.</span>
                  </div>
                ) : (
                  sentCode && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        <strong>Demo Mode:</strong> Your code is:{' '}
                        <strong className="font-mono">{sentCode}</strong>
                      </span>
                    </div>
                  )
                )}
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => {
                      setCode(value);
                      setError('');
                    }}
                    disabled={loading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-10 h-12" />
                      <InputOTPSlot index={1} className="w-10 h-12" />
                      <InputOTPSlot index={2} className="w-10 h-12" />
                      <InputOTPSlot index={3} className="w-10 h-12" />
                      <InputOTPSlot index={4} className="w-10 h-12" />
                      <InputOTPSlot index={5} className="w-10 h-12" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  onClick={handleVerifyCode}
                  disabled={loading || code.length !== 6}
                  className="w-full h-11 bg-[#1877F2] hover:bg-[#166FE5]"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Continue'}
                </Button>
              </div>
            )}

            {step === 'password' && (
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    className="h-11 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    className="h-11 pl-10"
                  />
                </div>
                <Button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="w-full h-11 bg-[#42B72A] hover:bg-[#36A420]"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Reset Password'}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Main AuthScreen Component
export function AuthScreen({
  onLogin,
  onRegister,
  onVerifyEmail,
  onForgotPassword,
  onResetPassword,
  onResendCode,
  loading,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState<string | undefined>();
  const [emailSent, setEmailSent] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      setLoginError('');
      const result = await onLogin(email, password);
      if (!result.success) {
        setLoginError(result.error || 'Login failed');
      }
    },
    [onLogin]
  );

  const handleRegister = useCallback(
    async (data: RegisterData): Promise<RegisterResult> => {
      const result = await onRegister(data);
      if (result.success) {
        setRegisteredEmail(data.email);
        setVerificationCode(result.verificationCode);
        setEmailSent(result.emailSent ?? false);
        setMode('verify');
      }
      return result;
    },
    [onRegister]
  );

  const handleVerify = useCallback(
    async (code: string) => {
      if (onVerifyEmail) {
        const result = await onVerifyEmail(registeredEmail, code);
        if (result.success) {
          setMode('login');
        } else {
          // Error is handled in the verification screen
        }
      }
    },
    [onVerifyEmail, registeredEmail]
  );

  const handleResendVerification = useCallback(async () => {
    if (onResendCode) {
      const result = await onResendCode(registeredEmail, 'verification');
      if (result.success && result.code) {
        setVerificationCode(result.code);
      }
    }
  }, [onResendCode, registeredEmail]);

  const handleForgotPasswordSendCode = useCallback(
    async (email: string) => {
      if (onForgotPassword) {
        return onForgotPassword(email);
      }
      return { success: false };
    },
    [onForgotPassword]
  );

  const handleForgotPasswordVerifyCode = useCallback(
    async (email: string, code: string) => {
      // In a real app, this would verify the code with the backend
      return { success: true };
    },
    []
  );

  const handleResetPasswordSubmit = useCallback(
    async (email: string, code: string, newPassword: string) => {
      if (onResetPassword) {
        return onResetPassword(email, code, newPassword);
      }
      return { success: false };
    },
    [onResetPassword]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {mode === 'login' && (
        <LoginForm
          onSubmit={handleLogin}
          onForgotPassword={() => setShowForgotPassword(true)}
          onSwitchToRegister={() => setMode('register')}
          loading={loading}
          error={loginError}
        />
      )}

      {mode === 'register' && (
        <RegisterForm
          onSubmit={handleRegister}
          onSwitchToLogin={() => setMode('login')}
          loading={loading}
        />
      )}

      {mode === 'verify' && (
        <VerificationScreen
          email={registeredEmail}
          verificationCode={verificationCode}
          emailSent={emailSent}
          onVerify={handleVerify}
          onResend={handleResendVerification}
          onBack={() => setMode('register')}
          loading={loading}
        />
      )}

      <ForgotPasswordModal
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onSendCode={handleForgotPasswordSendCode}
        onVerifyCode={handleForgotPasswordVerifyCode}
        onResetPassword={handleResetPasswordSubmit}
      />
    </div>
  );
}

export default AuthScreen;
