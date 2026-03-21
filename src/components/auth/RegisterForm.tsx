'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { COUNTRIES } from '@/types';

interface RegisterFormProps {
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    dateOfBirth?: string;
    gender?: string;
    country?: string;
  }) => Promise<{ success: boolean; verificationCode?: string; emailSent?: boolean; error?: string }>;
  onSwitchToLogin: () => void;
  loading?: boolean;
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
    return { valid: false, message: 'Password must contain an uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain a number' };
  }
  return { valid: true };
};

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Strong', color: 'bg-green-500' };
  return { score, label: 'Very Strong', color: 'bg-emerald-600' };
};

export function RegisterForm({ onSubmit, onSwitchToLogin, loading }: RegisterFormProps) {
  // Form state
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

  // Field touch state for validation display
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // Verification state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [userCodeInput, setUserCodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Clear error on input change
  useEffect(() => {
    if (error) setError('');
  }, [firstName, lastName, email, password, confirmPassword, error]);

  // Validation states
  const emailValid = email === '' || validateEmail(email);
  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword || confirmPassword === '';

  // Password strength
  const passwordStrength = getPasswordStrength(password);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!firstName.trim()) errors.push('First name is required');
    if (!lastName.trim()) errors.push('Last name is required');
    if (!validateEmail(email)) errors.push('Please enter a valid email');
    if (!passwordValidation.valid) errors.push(passwordValidation.message || 'Invalid password');
    if (password !== confirmPassword) errors.push('Passwords do not match');

    if (errors.length > 0) {
      setError(errors[0]);
      return false;
    }

    return true;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      // Mark all fields as touched
      setTouched({
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        confirmPassword: true,
      });

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

        if (result.success) {
          setRegisteredEmail(email);
          if (result.verificationCode) {
            setVerificationCode(result.verificationCode);
          }
          setEmailSent(result.emailSent ?? false);
          setShowVerification(true);
        } else {
          setError(result.error || 'Registration failed. Please try again.');
        }
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [firstName, lastName, email, password, confirmPassword, dateOfBirth, gender, country, onSubmit]
  );

  const handleVerify = useCallback(async () => {
    if (userCodeInput.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setVerifying(true);
    setError('');

    // Simulate verification - in real app this would call an API
    setTimeout(() => {
      if (verificationCode && userCodeInput === verificationCode) {
        onSwitchToLogin();
      } else {
        setError('Invalid verification code. Please try again.');
      }
      setVerifying(false);
    }, 1000);
  }, [userCodeInput, verificationCode, onSwitchToLogin]);

  const isLoading = loading || submitting || verifying;

  // Verification Screen
  if (showVerification) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white p-8 rounded-xl shadow-xl border border-gray-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Confirm your email</h2>
            <p className="text-gray-500 text-sm">
              We sent a verification code to<br />
              <strong className="text-gray-900">{registeredEmail}</strong>
            </p>
          </div>

          {/* Email Sent Indicator */}
          {emailSent ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-5 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Email sent! Check your inbox.</span>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-5 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Demo Mode:</strong> Your code is:{' '}
                <strong className="font-mono text-lg">{verificationCode}</strong>
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* OTP Input */}
          <div className="flex justify-center mb-5">
            <InputOTP
              maxLength={6}
              value={userCodeInput}
              onChange={(value) => {
                setUserCodeInput(value);
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

          <Button
            onClick={handleVerify}
            disabled={isLoading || userCodeInput.length !== 6}
            className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" />
                <span>Verifying...</span>
              </div>
            ) : (
              'Verify'
            )}
          </Button>

          <div className="text-center mt-4">
            <p className="text-gray-500 text-sm">
              Did&apos;t receive the code?{' '}
              <button
                type="button"
                className="text-[#1877F2] hover:underline font-medium inline-flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Resend
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-xl border border-gray-100">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Sign Up</h1>
          <p className="text-gray-500 text-sm">It&apos;s quick and easy.</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm flex items-start gap-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, firstName: true }))}
                  disabled={isLoading}
                  className={cn(
                    'h-11 pl-10 transition-all duration-200',
                    'focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]',
                    touched.firstName && !firstName.trim() && 'border-red-500'
                  )}
                  autoComplete="given-name"
                  required
                />
              </div>
              {touched.firstName && !firstName.trim() && (
                <p className="text-red-500 text-xs">Required</p>
              )}
            </div>
            <div className="space-y-1">
              <Input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, lastName: true }))}
                disabled={isLoading}
                className={cn(
                  'h-11 transition-all duration-200',
                  'focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]',
                  touched.lastName && !lastName.trim() && 'border-red-500'
                )}
                autoComplete="family-name"
                required
              />
              {touched.lastName && !lastName.trim() && (
                <p className="text-red-500 text-xs">Required</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-1">
            <div className="relative">
              <Mail
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors',
                  touched.email && !emailValid ? 'text-red-400' : 'text-gray-400'
                )}
              />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                disabled={isLoading}
                className={cn(
                  'h-11 pl-10 pr-10 transition-all duration-200',
                  'focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]',
                  touched.email && !emailValid && 'border-red-500'
                )}
                autoComplete="email"
                required
              />
              {touched.email && emailValid && email && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {touched.email && !emailValid && (
              <p className="text-red-500 text-xs">Please enter a valid email</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                disabled={isLoading}
                className={cn(
                  'h-11 pl-10 pr-10 transition-all duration-200',
                  'focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]',
                  touched.password && !passwordValidation.valid && 'border-red-500'
                )}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-all duration-200',
                        i <= passwordStrength.score
                          ? passwordStrength.color
                          : 'bg-gray-200'
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Password strength: <span className="font-medium">{passwordStrength.label}</span>
                </p>
              </div>
            )}

            {touched.password && !passwordValidation.valid && (
              <p className="text-red-500 text-xs">{passwordValidation.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                disabled={isLoading}
                className={cn(
                  'h-11 pl-10 pr-10 transition-all duration-200',
                  'focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]',
                  touched.confirmPassword && !passwordsMatch && 'border-red-500'
                )}
                autoComplete="new-password"
                required
              />
              {touched.confirmPassword && passwordsMatch && confirmPassword && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {touched.confirmPassword && !passwordsMatch && (
              <p className="text-red-500 text-xs">Passwords do not match</p>
            )}
          </div>

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
                  className="h-11 pl-10 transition-all duration-200 focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] transition-all duration-200"
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
                className="w-full h-11 border border-gray-300 rounded-md pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2] transition-all duration-200"
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
            <a href="#" className="text-[#1877F2] hover:underline font-medium">
              Learn more
            </a>
            .
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            By clicking Sign Up, you agree to our{' '}
            <a href="#" className="text-[#1877F2] hover:underline font-medium">
              Terms
            </a>
            ,{' '}
            <a href="#" className="text-[#1877F2] hover:underline font-medium">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="#" className="text-[#1877F2] hover:underline font-medium">
              Cookies Policy
            </a>
            .
          </p>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#42B72A] hover:bg-[#36A420] text-white text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" />
                <span>Signing up...</span>
              </div>
            ) : (
              'Sign Up'
            )}
          </Button>
        </form>

        <Separator className="my-6" />

        {/* Switch to Login */}
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#1877F2] hover:underline font-medium transition-colors"
          >
            Already have an account?
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterForm;
