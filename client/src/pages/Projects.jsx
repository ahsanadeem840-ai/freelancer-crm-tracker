import React, { useState } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2
} from 'lucide-react';

const mockProjects = [
  {
    id: 'p1',
    title: 'HealthTech Mobile Telehealth App',
    client: 'CarePulse Global',
    status: 'in_progress',
    priority: 'high',
    budget: 8500,
    deadline: '2026-10-15',
    progress: 68,
    tasksCount: 12,
    tasksDone: 8,
  },
  {
    id: 'p2',
    title: 'Next.js SaaS Marketing Redesign',
    client: 'CloudScale Inc',
    status: 'review',
    priority: 'medium',
    budget: 4200,
    deadline: '2026-09-30',
    progress: 92,
    tasksCount: 14,
    tasksDone: 13,
  },
  {
    id: 'p3',
    title: 'Fintech Crypto Dashboard & API',
    client: 'Aether Capital',
    status: 'in_progress',
    priority: 'high',
    budget: 12000,
    deadline: '2026-11-20',
    progress: 45,
    tasksCount: 22,
    tasksDone: 10,
  },
  {
    id: 'p4',
    title: 'Shopify Plus Custom Storefront',
    client: 'Nordic Apparel',
    status: 'completed',
    priority: 'low',
    budget: 3800,
    deadline: '2026-09-18',
    progress: 100,
    tasksCount: 9,
    tasksDone: 9,
  },
  {
    id: 'p5',
    title: 'Enterprise RBAC Authentication Gateway',
    client: 'CyberCore Defense',
    status: 'planning',
    priority: 'high',
    budget: 6500,
    deadline: '2026-12-05',
    progress: 15,
    tasksCount: 16,
    tasksDone: 2,
  },
];

export default function Projects() {
  const [filter, setFilter] = useState('all');

  const filteredProjects = mockProjects.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="badge badge-active">Completed</span>;
      case 'in_progress': return <span className="badge badge-lead">In Progress</span>;
      case 'review': return <span className="badge badge-prospect">In Review</span>;
      default: return <span className="badge badge-draft">Planning</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>Project Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Deliverables, milestone progress, budgets, and client relations (Day 9 API)
          </p>
        </div>

        <button className="btn-primary" onClick={() => alert('Add Project modal - connects to POST /api/projects!')}>
          <Plus size={16} />
          <span>Create Project</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Projects' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'review', label: 'In Review' },
          { id: 'planning', label: 'Planning' },
          { id: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: filter === tab.id ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.04)',
              color: filter === tab.id ? '#fff' : '#94a3b8',
              border: filter === tab.id ? 'none' : '1px solid var(--border-subtle)',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="grid-3">
        {filteredProjects.map((p) => (
          <div key={p.id} className="glass-card glass-card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className={`badge badge-${p.priority}`}>{p.priority} priority</span>
              {getStatusBadge(p.status)}
            </div>

            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>{p.title}</h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem' }}>
                <Building2 size={13} color="#818cf8" /> {p.client}
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#94a3b8' }}>Milestone Completion</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{p.progress}%</span>
              </div>
              <div style={{ height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${p.progress}%`,
                  height: '100%',
                  background: p.progress === 100 ? 'var(--accent-emerald)' : 'var(--primary-gradient)',
                  borderRadius: '999px',
                }} />
              </div>
            </div>

            {/* Metadata Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.85rem',
              fontSize: '0.78rem',
              color: '#94a3b8',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fff', fontWeight: 700 }}>
                <DollarSign size={14} color="#34d399" /> ${p.budget.toLocaleString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={13} /> {p.deadline}
              </span>
              <span style={{ color: '#818cf8', fontWeight: 600 }}>
                {p.tasksDone}/{p.tasksCount} tasks
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
