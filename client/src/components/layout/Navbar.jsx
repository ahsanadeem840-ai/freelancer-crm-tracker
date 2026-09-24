import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Bell, 
  Plus, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

const routeTitles = {
  '/': { main: 'Dashboard Overview', sub: 'Welcome back to your command center' },
  '/clients': { main: 'Client Directory & CRM', sub: 'Manage leads, active clients, and deals' },
  '/projects': { main: 'Project Tracking', sub: 'Monitor deliverables, milestones, and budgets' },
  '/tasks': { main: 'Kanban Task Board', sub: 'Visual agile sprint workflow & reordering' },
  '/invoices': { main: 'Invoices & Billing', sub: 'Issue invoices, calculate taxes, and collect payments' },
  '/login': { main: 'Account Login', sub: 'Sign in to access your secured workspace' },
  '/register': { main: 'Join FreelanceFlow', sub: 'Create your account and choose your role' },
};

export default function Navbar({ onToggleSidebar }) {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const currentInfo = routeTitles[location.pathname] || {
    main: 'Workspace',
    sub: 'Freelancer CRM & Project Platform',
  };

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button 
          className="menu-toggle-btn" 
          onClick={onToggleSidebar}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="page-breadcrumb">
          <span className="breadcrumb-sub">{currentInfo.sub}</span>
          <h1 className="breadcrumb-main">{currentInfo.main}</h1>
        </div>
      </div>

      <div className="topbar-right">
        {/* Backend API status */}
        <div className="api-status-pill" title="Backend Express server running on port 5000">
          <span className="status-dot"></span>
          <span>API :5000</span>
        </div>

        {/* Global Search */}
        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search anything... (Ctrl+K)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button 
            className="btn-icon" 
            aria-label="Notifications"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <Bell size={18} />
            <span className="notification-count">3</span>
          </button>

          {notificationsOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 10px)',
              width: '300px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              padding: '1rem',
              zIndex: 100,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Notifications</span>
                <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600 }}>Mark all read</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ color: '#fff', fontWeight: 600 }}>Invoice INV-2026-001 paid</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>$4,250 received via Stripe</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ color: '#fff', fontWeight: 600 }}>New client lead created</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Apex Logistics LLC</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ color: '#fff', fontWeight: 600 }}>Milestone delivered</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>E-Commerce Mobile Redesign</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action */}
        <Link to="/invoices" className="btn-primary btn-sm">
          <Plus size={16} />
          <span>New Invoice</span>
        </Link>
      </div>
    </header>
  );
}
