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
  Briefcase
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('freelancer');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await register(name, email, password, role);
      if (res && res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 800);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please try again.');
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
          <UserPlus size={28} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
          Create your account
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.35rem' }}>
          Select your RBAC role &amp; start managing projects (Day 5 &amp; 7 API)
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
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>Account Provisioned!</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Welcome to FreelanceFlow. Navigating to dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} color="#818cf8" /> Full Name
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Muhammad Ahsan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} color="#818cf8" /> Email Address
              </label>
              <input
                type="email"
                required
                className="form-control"
                placeholder="ahsan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={14} color="#818cf8" /> Password
              </label>
              <input
                type="password"
                required
                className="form-control"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Briefcase size={14} color="#818cf8" /> Platform Role (RBAC)
              </label>
              <select
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ background: '#0f172a' }}
              >
                <option value="freelancer">Freelancer (Full Project &amp; Invoice Access)</option>
                <option value="agency_owner">Agency Owner (Manage Teams &amp; Multiple Clients)</option>
                <option value="client">Client (View Assigned Projects &amp; Pay Invoices)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

          </form>
        )}
      </div>

      {/* Switch to Login */}
      <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#818cf8', fontWeight: 600 }}>
          Sign In
        </Link>
      </div>

    </div>
  );
}
