'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  onSwitchToRegister: () => void;
  loading?: boolean;
  error?: string;
}

// Validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function LoginForm({
  onSubmit,
  onForgotPassword,
  onSwitchToRegister,
  loading,
  error: externalError,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  // Clear error when user types
  useEffect(() => {
    if (error) setError('');
  }, [email, password]);

  // Email validation state
  const emailValid = email === '' || validateEmail(email);
  const showEmailError = touched.email && !emailValid;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      // Mark all fields as touched
      setTouched({ email: true, password: true });

      // Validate email format
      if (!validateEmail(email)) {
        setError('Please enter a valid email address');
        return;
      }

      // Validate password is not empty
      if (!password) {
        setError('Please enter your password');
        return;
      }

      setSubmitting(true);
      try {
        await onSubmit(email, password);
      } catch (err) {
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, onSubmit]
  );

  const isLoading = loading || submitting;
  const displayError = externalError || error;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-xl border border-gray-100">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1877F2] mb-3 tracking-tight">
            facebook
          </h1>
          <p className="text-gray-500 text-sm">
            Connect with friends and the world around you.
          </p>
        </div>

        {/* Error Display */}
        {displayError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm flex items-start gap-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1">
            <div className="relative">
              <Mail
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors',
                  showEmailError ? 'text-red-400' : 'text-gray-400'
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
                  'h-12 pl-10 transition-all duration-200',
                  'focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]',
                  showEmailError && 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                )}
                autoComplete="email"
                required
              />
              {touched.email && emailValid && email && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {showEmailError && (
              <p className="text-red-500 text-xs ml-1 animate-in fade-in-0 slide-in-from-top-1 duration-150">
                Please enter a valid email address
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                disabled={isLoading}
                className="h-12 pl-10 pr-10 transition-all duration-200 focus:ring-2 focus:ring-[#1877F2]/20 focus:border-[#1877F2]"
                autoComplete="current-password"
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
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full h-12 text-base font-semibold transition-all duration-200',
              'bg-[#1877F2] hover:bg-[#166FE5] text-white',
              'disabled:opacity-70 disabled:cursor-not-allowed',
              'shadow-md hover:shadow-lg'
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" />
                <span>Logging in...</span>
              </div>
            ) : (
              'Log In'
            )}
          </Button>
        </form>

        {/* Forgot Password Link */}
        <div className="text-center mt-5">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-[#1877F2] hover:underline font-medium hover:text-[#166FE5] transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <Separator className="my-6" />

        {/* Create Account Button */}
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            onClick={onSwitchToRegister}
            className="bg-[#42B72A] hover:bg-[#36A420] text-white border-0 h-12 px-8 text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Create New Account
          </Button>
        </div>
      </div>

      {/* Footer Links */}
      <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
        By continuing, you agree to our{' '}
        <a href="#" className="text-[#1877F2] hover:underline font-medium">
          Terms of Service
        </a>
        {' '}and{' '}
        <a href="#" className="text-[#1877F2] hover:underline font-medium">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}

export default LoginForm;
