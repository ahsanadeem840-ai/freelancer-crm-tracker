import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LogIn, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Demo credential autofill helper
  const handleDemoFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Secret123!');
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await login(email, password);
      if (res && res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 800);
      } else {
        setErrorMsg('Invalid login credentials.');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Authentication failed. Please verify credentials.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      {/* Background Decorative Blur Spheres */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl -translate-y-12"></div>
        <div className="w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl translate-x-32 translate-y-24"></div>
      </div>

      <div className="relative w-full max-w-lg mx-auto">
        
        {/* Top Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl shadow-indigo-500/20 mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome back
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Sign in to manage your clients, projects &amp; invoices
          </p>
        </div>

        {/* Card Container */}
        <div className="backdrop-blur-xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10">
          
          {success ? (
            <div className="py-10 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center animate-bounce">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Authenticated Successfully!</h3>
                <p className="text-sm text-slate-400 mt-1">Preparing your CRM command dashboard...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {/* Error Alert Banner */}
              {errorMsg && (
                <div className="flex items-center gap-3 p-4 text-sm rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-5 h-5 absolute left-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="freelancer@example.com"
                    className="w-full h-12 pl-11 pr-4 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password recovery is available via standard reset email.');
                    }}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-5 h-5 absolute left-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-12 pl-11 pr-11 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400">Remember my session</span>
                </label>
                <span className="text-xs text-emerald-400 font-medium">JWT Secure</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 px-4 mt-2 flex items-center justify-center gap-2 rounded-xl text-white font-semibold text-sm bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* 1-Click Demo Credentials */}
              <div className="pt-5 mt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Demo Credentials
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Pass: Secret123!</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleDemoFill('freelancer@test.com')}
                    className="py-2 px-3 text-xs font-medium rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer text-center"
                  >
                    Freelancer Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('admin@test.com')}
                    className="py-2 px-3 text-xs font-medium rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer text-center"
                  >
                    Admin Demo
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>

        {/* Footer Link */}
        <p className="text-center text-sm text-slate-400 mt-8">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            Create an account
          </Link>
        </p>

      </div>
    </div>
  );
}
