import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Building2, 
  DollarSign,
  ExternalLink,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';

const mockClients = [
  { id: '1', name: 'Dr. Sarah Mitchell', company: 'CarePulse Global', email: 'sarah@carepulse.io', phone: '+1 (555) 234-5678', status: 'active', totalBilled: 12500, totalPaid: 12500, projects: 2 },
  { id: '2', name: 'Marcus Vance', company: 'CloudScale Inc', email: 'marcus@cloudscale.net', phone: '+1 (555) 876-5432', status: 'active', totalBilled: 8400, totalPaid: 6300, projects: 1 },
  { id: '3', name: 'Elena Rostova', company: 'Aether Capital', email: 'elena@aethercap.com', phone: '+44 20 7946 0912', status: 'prospect', totalBilled: 18000, totalPaid: 6000, projects: 1 },
  { id: '4', name: 'Julian Drake', company: 'Nordic Apparel', email: 'julian@nordicapparel.se', phone: '+46 8 123 4567', status: 'active', totalBilled: 4200, totalPaid: 4200, projects: 2 },
  { id: '5', name: 'Kenji Takahashi', company: 'NeoTokyo Interactive', email: 'kenji@neotokyo.jp', phone: '+81 3 5555 0143', status: 'lead', totalBilled: 0, totalPaid: 0, projects: 0 },
  { id: '6', name: 'Amara Okafor', company: 'Sahara Logistics', email: 'amara@saharalog.ng', phone: '+234 1 234 5678', status: 'lead', totalBilled: 0, totalPaid: 0, projects: 0 },
];

export default function Clients() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredClients = mockClients.filter((c) => {
    const matchesFilter = filter === 'all' || c.status === filter;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          c.company.toLowerCase().includes(search.toLowerCase()) ||
                          c.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return <span className="badge badge-active">Active</span>;
      case 'prospect': return <span className="badge badge-prospect">Prospect</span>;
      case 'lead': return <span className="badge badge-lead">Lead</span>;
      default: return <span className="badge badge-inactive">Inactive</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>Client CRM Directory</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Manage client accounts, pipeline stages, and multi-tenant revenue balances (Day 8 API)
          </p>
        </div>

        <button className="btn-primary" onClick={() => alert('Add Client modal - connected to POST /api/clients in upcoming days!')}>
          <UserPlus size={16} />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Pipeline Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Clients', count: mockClients.length },
            { id: 'active', label: 'Active', count: mockClients.filter(c => c.status === 'active').length },
            { id: 'prospect', label: 'Prospects', count: mockClients.filter(c => c.status === 'prospect').length },
            { id: 'lead', label: 'Leads', count: mockClients.filter(c => c.status === 'lead').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: filter === tab.id ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.04)',
                color: filter === tab.id ? '#fff' : '#94a3b8',
                border: filter === tab.id ? 'none' : '1px solid var(--border-subtle)',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.2rem', paddingBottom: '0.45rem', paddingTop: '0.45rem', fontSize: '0.82rem' }}
            placeholder="Search by client or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client Name &amp; Company</th>
                <th>Contact</th>
                <th>Pipeline Stage</th>
                <th>Projects</th>
                <th>Total Billed</th>
                <th>Total Paid</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.4))',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: '#c7d2fe',
                      }}>
                        {client.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{client.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Building2 size={12} /> {client.company}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#cbd5e1' }}>
                        <Mail size={12} color="#818cf8" /> {client.email}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8' }}>
                        <Phone size={12} color="#34d399" /> {client.phone}
                      </span>
                    </div>
                  </td>
                  <td>{getStatusBadge(client.status)}</td>
                  <td style={{ color: '#cbd5e1', fontWeight: 600 }}>{client.projects} active</td>
                  <td style={{ color: '#fff', fontWeight: 700 }}>${client.totalBilled.toLocaleString()}</td>
                  <td>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>${client.totalPaid.toLocaleString()}</span>
                    {client.totalBilled > client.totalPaid && (
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#fb7185' }}>
                        ${(client.totalBilled - client.totalPaid).toLocaleString()} due
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary btn-sm" title="View Client Details">
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
