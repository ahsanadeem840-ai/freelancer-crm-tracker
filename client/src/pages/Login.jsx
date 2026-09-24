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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDemoFill = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Secret123!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await login(email, password);
      if (res && res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 800);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '480px',
      margin: '2rem auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          padding: '0.75rem',
          borderRadius: '16px',
          background: 'var(--primary-gradient)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
          marginBottom: '1rem',
        }}>
          <KeyRound size={28} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
          Welcome back
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.35rem' }}>
          Sign in to your FreelanceFlow CRM workspace (Day 6 JWT Auth)
        </p>
      </div>

      {/* Main Glass Card Form */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        {success ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={32} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>Authentication Verified!</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Redirecting to your command dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} color="#818cf8" /> Email Address
              </label>
              <input
                type="email"
                required
                className="form-control"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={14} color="#818cf8" /> Password
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset will be available with full auth!'); }} style={{ fontSize: '0.75rem', color: '#818cf8' }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                className="form-control"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Quick Demo Credentials Autofill */}
            <div style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Quick Test Credentials (Day 6 Seed)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleDemoFill('freelancer@test.com', 'Freelancer')}
                  className="btn-secondary btn-sm"
                  style={{ flex: 1, fontSize: '0.75rem' }}
                >
                  Freelancer Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('admin@test.com', 'Admin')}
                  className="btn-secondary btn-sm"
                  style={{ flex: 1, fontSize: '0.75rem' }}
                >
                  Admin Demo
                </button>
              </div>
            </div>

          </form>
        )}
      </div>

      {/* Switch to Register */}
      <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
        Don't have an account yet?{' '}
        <Link to="/register" style={{ color: '#818cf8', fontWeight: 600 }}>
          Create an account
        </Link>
      </div>

    </div>
  );
}
