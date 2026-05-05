import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle, ArrowLeft, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';
import { EmailConfirmationService, type EmailConfirmationStatus } from '../lib/emailConfirmation';

interface ConfirmationProps {
  theme: 'light' | 'dark';
  navigateTo: (view: string) => void;
  email?: string;
}

export const Confirmation: React.FC<ConfirmationProps> = ({ theme, navigateTo, email }) => {
  const location = useLocation();
  const [confirmationStatus, setConfirmationStatus] = useState<EmailConfirmationStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);
  
  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-black' : 'bg-[#F0F0F0]';
  const cardClass = isDark 
    ? 'bg-[#0a0a0a] border-white/10' 
    : 'bg-white border-black/10';
  const textClass = isDark ? 'text-white' : 'text-black';
  const mutedClass = isDark ? 'text-white/60' : 'text-black/60';
  const buttonClass = isDark 
    ? 'bg-[#CDA032] text-black hover:bg-[#B38B21]' 
    : 'bg-[#CDA032] text-black hover:bg-[#B38B21]';

  // Check if user is coming from email confirmation
  useEffect(() => {
    const urlCheck = EmailConfirmationService.checkConfirmationClickFromUrl();
    
    if (urlCheck.confirmed) {
      console.log('Email confirmation detected from URL!');
      navigateTo('/auth?message=Email confirmed! Please login to continue.');
      return;
    }
    
    // Check current confirmation status
    if (email) {
      checkConfirmationStatus();
    }
  }, [email, navigateTo]);

  // Periodic check for email confirmation status
  useEffect(() => {
    if (!email || confirmationStatus?.isEmailConfirmed) return;
    
    const interval = setInterval(async () => {
      console.log('Checking if verification link has been clicked...');
      const status = await EmailConfirmationService.checkEmailConfirmationByEmail(email);
      
      if (status?.isEmailConfirmed) {
        console.log('✅ Verification link clicked! Redirecting to login...');
        setConfirmationStatus(status);
        setMonitoringActive(false);
        clearInterval(interval);
        
        // Show success message and redirect to login
        setTimeout(() => {
          navigateTo('/auth?message=Email confirmed! Please login to continue.');
        }, 1000);
      }
    }, 3000); // Check every 3 seconds
    
    // Cleanup interval after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setMonitoringActive(false);
      console.log('Stopped checking for verification link (timeout)');
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [email, confirmationStatus, navigateTo]);

  // Check email confirmation status
  const checkConfirmationStatus = async () => {
    if (!email) return;
    
    setIsChecking(true);
    try {
      const status = await EmailConfirmationService.checkEmailConfirmationByEmail(email);
      setConfirmationStatus(status);
      
      // If email is confirmed, redirect to login
      if (status?.isEmailConfirmed) {
        console.log('Email already confirmed!');
        navigateTo('/auth?message=Email confirmed! Please login to continue.');
      }
    } catch (error) {
      console.error('Error checking confirmation status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Start monitoring for email confirmation
  const startMonitoring = () => {
    if (!email || monitoringActive) return;
    
    console.log('Starting email confirmation monitoring...');
    setMonitoringActive(true);
    
    // In a real implementation, you'd need the user ID
    // For now, we'll just check periodically by email
    const monitorInterval = setInterval(async () => {
      const status = await EmailConfirmationService.checkEmailConfirmationByEmail(email);
      
      if (status?.isEmailConfirmed) {
        console.log('Email confirmed via monitoring!');
        setMonitoringActive(false);
        clearInterval(monitorInterval);
        navigateTo('/auth?message=Email confirmed! Please login to continue.');
      }
    }, 5000); // Check every 5 seconds
    
    // Stop monitoring after 5 minutes to avoid infinite polling
    setTimeout(() => {
      clearInterval(monitorInterval);
      setMonitoringActive(false);
      console.log('Email confirmation monitoring stopped (timeout)');
    }, 5 * 60 * 1000);
  };

  // Handle resend email
  const handleResendEmail = async () => {
    if (!email || isResending) return;
    
    setIsResending(true);
    try {
      const result = await EmailConfirmationService.resendConfirmationEmail(email);
      
      if (result.success) {
        console.log('Confirmation email resent successfully');
        // You could show a success notification here
        startMonitoring(); // Start monitoring after resending
      } else {
        console.error('Failed to resend confirmation email:', result.error);
        // You could show an error notification here
      }
    } catch (error) {
      console.error('Error resending confirmation email:', error);
    } finally {
      setIsResending(false);
    }
  };

  // Auto-start monitoring when component mounts
  useEffect(() => {
    if (email && !confirmationStatus?.isEmailConfirmed) {
      startMonitoring();
    }
    
    return () => {
      // Cleanup monitoring when component unmounts
      setMonitoringActive(false);
    };
  }, [email, confirmationStatus]);

  return (
    <div className={`view-transition flex-1 min-h-0 flex items-center justify-center p-4 lg:p-6 overflow-auto ${bgClass}`}>
      <div className={`w-full max-w-md mx-auto rounded-2xl border shadow-2xl p-8 ${cardClass}`}>
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full ${isDark ? 'bg-[#CDA032]/20' : 'bg-[#CDA032]/10'} flex items-center justify-center`}>
            <Mail className={`w-10 h-10 ${isDark ? 'text-[#CDA032]' : 'text-[#CDA032]'}`} />
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="text-center space-y-4">
          <h1 className={`text-2xl font-black ${textClass}`}>
            Check Your Email
          </h1>
          
          <p className={`${mutedClass} leading-relaxed`}>
            We've sent a confirmation email to:
          </p>
          
          {email && (
            <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`}>
              <p className={`font-medium ${textClass}`}>{email}</p>
            </div>
          )}
          
          <p className={`${mutedClass} text-sm leading-relaxed`}>
            Click the confirmation link in the email to activate your account and complete your registration.
          </p>
        </div>

        {/* Status Display */}
        {confirmationStatus && (
          <div className={`mt-6 p-4 rounded-lg ${
            confirmationStatus.isEmailConfirmed 
              ? isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'
              : isDark ? 'bg-white/5' : 'bg-black/5'
          } space-y-3`}>
            <div className="flex items-center gap-3">
              {confirmationStatus.isEmailConfirmed ? (
                <>
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <p className={`font-medium ${textClass} text-sm`}>
                      ✅ Verification Link Clicked!
                    </p>
                    <p className={`${mutedClass} text-xs mt-1`}>
                      Redirecting you to login page...
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Clock className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  <div>
                    <p className={`font-medium ${textClass} text-sm`}>
                      ⏳ Awaiting Verification
                    </p>
                    <p className={`${mutedClass} text-xs mt-1`}>
                      Click the link in your email to verify
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Monitoring Status */}
        {monitoringActive && !confirmationStatus?.isEmailConfirmed && (
          <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                🔍 Checking if verification link has been clicked...
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'} space-y-3`}>
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-[#CDA032]' : 'text-[#CDA032]'}`} />
            <div>
              <p className={`font-medium ${textClass} text-sm`}>Check your inbox</p>
              <p className={`${mutedClass} text-xs mt-1`}>Look for an email from BlackBox</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-[#CDA032]' : 'text-[#CDA032]'}`} />
            <div>
              <p className={`font-medium ${textClass} text-sm`}>Click the link</p>
              <p className={`${mutedClass} text-xs mt-1`}>Click the confirmation link in the email</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-[#CDA032]' : 'text-[#CDA032]'}`} />
            <div>
              <p className={`font-medium ${textClass} text-sm`}>Login to your account</p>
              <p className={`${mutedClass} text-xs mt-1`}>After confirmation, you can login to BlackBox</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => navigateTo('auth')}
            className={`w-full py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${buttonClass}`}
          >
            Go to Login
          </button>
          
          <button
            onClick={handleResendEmail}
            disabled={isResending || !email}
            className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              isResending || !email
                ? `${mutedClass} cursor-not-allowed`
                : `${mutedClass} hover:${textClass}`
            }`}
          >
            <RefreshCw size={16} className={isResending ? 'animate-spin' : ''} />
            {isResending ? 'Sending...' : 'Resend Confirmation Email'}
          </button>
          
          <button
            onClick={checkConfirmationStatus}
            disabled={isChecking || !email}
            className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              isChecking || !email
                ? `${mutedClass} cursor-not-allowed`
                : `${mutedClass} hover:${textClass}`
            }`}
          >
            {isChecking ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigateTo('home')}
            className={`inline-flex items-center gap-2 ${mutedClass} hover:${textClass} transition-colors text-sm`}
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
