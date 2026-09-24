import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  Receipt,
  LogIn,
  UserPlus,
  Sparkles,
  X,
  Briefcase,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { path: '/clients', label: 'Clients CRM', icon: Users, badge: '18' },
  { path: '/projects', label: 'Projects', icon: FolderKanban, badge: '9' },
  { path: '/tasks', label: 'Kanban Tasks', icon: CheckSquare, badge: '24' },
  { path: '/invoices', label: 'Invoices & Billing', icon: Receipt, badge: 'New' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAuthenticated } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <Link to="/" className="brand-logo" onClick={onClose}>
          <div className="logo-icon-wrapper">
            <Briefcase size={20} />
          </div>
          <div className="brand-text-wrapper">
            <span className="brand-title">FreelanceFlow</span>
            <span className="brand-badge">CRM &amp; Tracker</span>
          </div>
        </Link>
        <button 
          className="menu-toggle-btn" 
          onClick={onClose}
          aria-label="Close Sidebar"
          style={{ display: isOpen ? 'flex' : 'none' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">Core Workspace</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          );
        })}

        <div className="nav-section-title" style={{ marginTop: '1.25rem' }}>Authentication</div>
        <NavLink
          to="/login"
          onClick={onClose}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LogIn size={19} />
          <span>Sign In</span>
        </NavLink>
        <NavLink
          to="/register"
          onClick={onClose}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <UserPlus size={19} />
          <span>Create Account</span>
        </NavLink>

        {/* Roadmap Tag Banner */}
        <div style={{
          marginTop: 'auto',
          padding: '0.9rem',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))',
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a5b4fc', fontSize: '0.78rem', fontWeight: 700 }}>
            <Sparkles size={14} />
            <span>MERN Stack • Day 12</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            React 19 + React Router v7 SPA setup complete.
          </div>
        </div>
      </nav>

      {/* User Footer Profile */}
      <div className="sidebar-footer">
        <div className="user-profile-widget" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <div className="user-avatar">{getInitials(user?.name)}</div>
            <div className="user-details">
              <span className="user-name">{user?.name || 'Guest User'}</span>
              <span className="user-role" style={{ textTransform: 'capitalize' }}>
                {user?.role || 'Guest'}
              </span>
            </div>
          </div>
          {isAuthenticated && (
            <button
              onClick={logout}
              title="Logout session"
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                color: '#fb7185',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
