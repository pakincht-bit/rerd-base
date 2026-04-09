import React, { useState } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../services/AuthContext';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { signInWithGoogle, isConfigured } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isConfigured) {
    return (
      <div className="fixed inset-0 z-[500] bg-[#1a1c22]/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-2xl rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] w-full max-w-sm p-8 relative border border-white/50 animate-in zoom-in-95 duration-200 text-center">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Auth Not Configured</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Supabase environment variables are missing. Set <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</span> and <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</span> in your <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">.env.local</span> file.
          </p>
        </div>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setError('Failed to initiate Google sign-in');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all">
      <div className="bg-white/95 backdrop-blur-2xl w-full max-w-[400px] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] relative animate-in zoom-in-95 duration-200 overflow-hidden border border-white/50">
        
        {/* Header */}
        <div className="px-8 pt-10 pb-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-5">
            <img src="/logo.svg" alt="Radia" className="w-12 h-12" />
          </div>

          <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Welcome to Radia
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-2">
            Sign in to save and sync your projects.
          </p>
        </div>

        {/* Action Panel */}
        <div className="px-8 pb-10 flex flex-col relative bg-transparent">
          {error && (
            <div className="flex items-start gap-2 p-3 mb-6 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 shadow-sm animate-in zoom-in-95">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm font-bold text-gray-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin text-gray-500" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
