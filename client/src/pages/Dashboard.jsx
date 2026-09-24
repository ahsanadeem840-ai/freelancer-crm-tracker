import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  CheckSquare,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Clock,
  Sparkles,
  Plus,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const stats = [
  {
    label: 'Total Clients',
    value: '18',
    trend: '+12.5%',
    trendType: 'positive',
    subtext: 'vs last month',
    icon: Users,
    colorClass: 'stat-indigo',
    iconClass: 'stat-icon-indigo',
    link: '/clients'
  },
  {
    label: 'Active Projects',
    value: '9',
    trend: '3 in review',
    trendType: 'neutral',
    subtext: '5 in progress',
    icon: FolderKanban,
    colorClass: 'stat-cyan',
    iconClass: 'stat-icon-cyan',
    link: '/projects'
  },
  {
    label: 'Kanban Tasks',
    value: '24',
    trend: '8 high priority',
    trendType: 'neutral',
    subtext: '12 completed this week',
    icon: CheckSquare,
    colorClass: 'stat-emerald',
    iconClass: 'stat-icon-emerald',
    link: '/tasks'
  },
  {
    label: 'Total Revenue',
    value: '$24,850',
    trend: '+$4,250 this week',
    trendType: 'positive',
    subtext: '$19,400 collected',
    icon: DollarSign,
    colorClass: 'stat-amber',
    iconClass: 'stat-icon-amber',
    link: '/invoices'
  },
];

const recentProjects = [
  { id: 1, title: 'HealthTech Mobile Telehealth App', client: 'CarePulse Global', status: 'in_progress', budget: '$8,500', progress: 68 },
  { id: 2, title: 'Next.js SaaS Marketing Redesign', client: 'CloudScale Inc', status: 'review', budget: '$4,200', progress: 92 },
  { id: 3, title: 'Fintech Crypto Dashboard & API', client: 'Aether Capital', status: 'in_progress', budget: '$12,000', progress: 45 },
  { id: 4, title: 'Shopify Plus Custom Storefront', client: 'Nordic Apparel', status: 'completed', budget: '$3,800', progress: 100 },
];

const recentInvoices = [
  { id: 'INV-2026-001', client: 'CarePulse Global', amount: '$4,250', status: 'paid', date: 'Sep 22, 2026' },
  { id: 'INV-2026-002', client: 'CloudScale Inc', amount: '$2,100', status: 'sent', date: 'Sep 23, 2026' },
  { id: 'INV-2026-003', client: 'Aether Capital', amount: '$6,000', status: 'draft', date: 'Sep 24, 2026' },
  { id: 'INV-2026-004', client: 'Nexus AI Labs', amount: '$1,500', status: 'overdue', date: 'Sep 10, 2026' },
];

export default function Dashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome Hero Banner */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(139, 92, 246, 0.12) 50%, rgba(15, 23, 42, 0.8) 100%)',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: '650px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#818cf8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Sparkles size={16} /> Command Center Overview
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            Welcome back, Ahsan! 🚀
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
            Here is what is happening across your clients, project pipelines, and pending Stripe invoices today. All systems are operating smoothly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/clients" className="btn-secondary">
            <Users size={16} />
            <span>Manage Clients</span>
          </Link>
          <Link to="/projects" className="btn-primary">
            <Plus size={16} />
            <span>New Project</span>
          </Link>
        </div>
      </div>

      {/* 4 Metric Stats Grid */}
      <div className="grid-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link key={idx} to={stat.link} style={{ display: 'block' }}>
              <div className={`glass-card glass-card-interactive stat-card ${stat.colorClass}`}>
                <div className="stat-info">
                  <span className="stat-label">{stat.label}</span>
                  <span className="stat-value">{stat.value}</span>
                  <div className="stat-trend neutral">
                    <span style={{ color: stat.trendType === 'positive' ? '#10b981' : '#cbd5e1' }}>
                      {stat.trend}
                    </span>
                    <span style={{ color: '#64748b' }}>• {stat.subtext}</span>
                  </div>
                </div>
                <div className={`stat-icon-wrapper ${stat.iconClass}`}>
                  <Icon size={24} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Grid: Projects & Invoices */}
      <div className="grid-2">
        
        {/* Active Projects Table */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Ongoing Projects</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real-time deliverables and milestone progress</p>
            </div>
            <Link to="/projects" className="btn-secondary btn-sm">
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((proj) => (
                  <tr key={proj.id}>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{proj.title}</td>
                    <td style={{ color: '#94a3b8' }}>{proj.client}</td>
                    <td>
                      <span className={`badge ${proj.status === 'completed' ? 'badge-active' : proj.status === 'review' ? 'badge-prospect' : 'badge-lead'}`}>
                        {proj.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ minWidth: '100px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${proj.progress}%`,
                            height: '100%',
                            background: proj.progress === 100 ? 'var(--accent-emerald)' : 'var(--primary-gradient)',
                            borderRadius: '999px',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', width: '32px' }}>{proj.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invoices Table */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Recent Invoices</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Direct billing &amp; payment settlement tracker</p>
            </div>
            <Link to="/invoices" className="btn-secondary btn-sm">
              <span>All Invoices</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#818cf8' }}>{inv.id}</td>
                    <td style={{ color: '#f8fafc' }}>{inv.client}</td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{inv.amount}</td>
                    <td>
                      <span className={`badge badge-${inv.status}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MERN Architecture Blueprint Widget */}
      <div className="glass-card" style={{
        background: 'rgba(15, 23, 42, 0.4)',
        borderColor: 'rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px', color: '#818cf8' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0 }}>Fullstack Roadmap Alignment</h4>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Backend APIs verified across Din 1 - Din 11. Din 12 frontend SPA is now online.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-active">MongoDB Mongoose (v9)</span>
            <span className="badge badge-active">Express (v5)</span>
            <span className="badge badge-active">React (v19)</span>
            <span className="badge badge-active">React Router (v7)</span>
            <span className="badge badge-active">Vite (v8)</span>
          </div>
        </div>
      </div>

    </div>
  );
}
