import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2,
  Briefcase,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('freelancer');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Compute password strength score (0 to 4)
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-slate-700' };
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('You must agree to the Terms of Service to register.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await register(name, email, password, role);
      if (res && res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 800);
      } else {
        setErrorMsg('Registration could not be completed.');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed. Try again.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      {/* Background Decorative Blur Spheres */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl -translate-y-12"></div>
        <div className="w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-3xl -translate-x-32 translate-y-24"></div>
      </div>

      <div className="relative w-full max-w-xl mx-auto">
        
        {/* Top Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl shadow-purple-500/20 mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Create your account
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Start managing clients, sprints, and payments with FreelanceFlow
          </p>
        </div>

        {/* Card Container */}
        <div className="backdrop-blur-xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10">
          
          {success ? (
            <div className="py-10 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Account Created Successfully!</h3>
                <p className="text-sm text-slate-400 mt-1">Redirecting to your workspace...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* Error Alert Banner */}
              {errorMsg && (
                <div className="flex items-center gap-3 p-4 text-sm rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-5 h-5 absolute left-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Muhammad Ahsan"
                    className="w-full h-12 pl-11 pr-4 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
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
                    placeholder="ahsan@example.com"
                    className="w-full h-12 pl-11 pr-4 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Password */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-5 h-5 absolute left-3.5 text-slate-500 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
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

                {/* Confirm Password */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-5 h-5 absolute left-3.5 text-slate-500 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full h-12 pl-11 pr-11 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Password Strength:</span>
                    <span className="font-semibold text-slate-300">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-slate-800'}`}></div>
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-slate-800'}`}></div>
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-slate-800'}`}></div>
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 4 ? strength.color : 'bg-slate-800'}`}></div>
                  </div>
                </div>
              )}

              {/* Platform Role (RBAC) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Account Role (RBAC)
                </label>
                <div className="relative flex items-center">
                  <Briefcase className="w-5 h-5 absolute left-3.5 text-slate-500 pointer-events-none" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer appearance-none"
                  >
                    <option value="freelancer" className="bg-slate-900 text-white">Freelancer (Full Project, Client &amp; Billing Access)</option>
                    <option value="agency_owner" className="bg-slate-900 text-white">Agency Owner (Manage Teams &amp; Multiple Workspaces)</option>
                    <option value="client" className="bg-slate-900 text-white">Client Portal (View Assigned Projects &amp; Pay Invoices)</option>
                  </select>
                </div>
              </div>

              {/* Terms Agreement Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 leading-relaxed">
                    I agree to the <a href="#terms" onClick={(e) => e.preventDefault()} className="text-indigo-400 hover:underline">Terms of Service</a> and <a href="#privacy" onClick={(e) => e.preventDefault()} className="text-indigo-400 hover:underline">Privacy Policy</a>.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 px-4 mt-3 flex items-center justify-center gap-2 rounded-xl text-white font-semibold text-sm bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

            </form>
          )}

        </div>

        {/* Footer Link */}
        <p className="text-center text-sm text-slate-400 mt-8">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign In
          </Link>
        </p>

      </div>
    </div>
  );
}
