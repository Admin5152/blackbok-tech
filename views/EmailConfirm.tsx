import React from 'react';
import { CheckCircle, ArrowLeft } from 'lucide-react';

interface EmailConfirmProps {
  theme: 'light' | 'dark';
  navigateTo: (view: string) => void;
}

export const EmailConfirm: React.FC<EmailConfirmProps> = ({ theme, navigateTo }) => {
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

  return (
    <div className={`view-transition flex-1 min-h-0 flex items-center justify-center p-4 lg:p-6 overflow-auto ${bgClass}`}>
      <div className={`w-full max-w-md mx-auto rounded-2xl border shadow-2xl p-8 ${cardClass}`}>
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full ${isDark ? 'bg-green-500/20' : 'bg-green-50'} flex items-center justify-center`}>
            <CheckCircle className={`w-10 h-10 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="text-center space-y-4">
          <h1 className={`text-2xl font-black ${textClass}`}>
            Email Confirmed!
          </h1>
          
          <p className={`${mutedClass} leading-relaxed`}>
            Your email has been successfully confirmed. Your account is now active and ready to use.
          </p>
          
          <div className={`p-4 rounded-lg ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
            <p className={`font-medium ${textClass} text-sm`}>
              ✅ Verification Complete
            </p>
            <p className={`${mutedClass} text-xs mt-1`}>
              You can now login to your account
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8">
          <button
            onClick={() => navigateTo('auth')}
            className={`w-full py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${buttonClass}`}
          >
            GO to LOGIN
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
