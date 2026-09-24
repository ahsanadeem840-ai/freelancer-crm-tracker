import React, { useState } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  CreditCard,
  Building2,
  ExternalLink
} from 'lucide-react';

const mockInvoices = [
  {
    id: 'inv_1',
    invoiceNumber: 'INV-2026-001',
    client: 'CarePulse Global',
    project: 'HealthTech Mobile Telehealth App',
    subtotal: 4000,
    taxRate: 10,
    taxAmount: 400,
    discount: 150,
    totalAmount: 4250,
    status: 'paid',
    issueDate: '2026-09-10',
    dueDate: '2026-09-24',
    paidAt: '2026-09-22',
  },
  {
    id: 'inv_2',
    invoiceNumber: 'INV-2026-002',
    client: 'CloudScale Inc',
    project: 'Next.js SaaS Marketing Redesign',
    subtotal: 2000,
    taxRate: 5,
    taxAmount: 100,
    discount: 0,
    totalAmount: 2100,
    status: 'sent',
    issueDate: '2026-09-18',
    dueDate: '2026-10-02',
    paidAt: null,
  },
  {
    id: 'inv_3',
    invoiceNumber: 'INV-2026-003',
    client: 'Aether Capital',
    project: 'Fintech Crypto Dashboard & API',
    subtotal: 6000,
    taxRate: 0,
    taxAmount: 0,
    discount: 0,
    totalAmount: 6000,
    status: 'draft',
    issueDate: '2026-09-24',
    dueDate: '2026-10-08',
    paidAt: null,
  },
  {
    id: 'inv_4',
    invoiceNumber: 'INV-2026-004',
    client: 'Nordic Apparel',
    project: 'Shopify Plus Custom Storefront',
    subtotal: 3800,
    taxRate: 0,
    taxAmount: 0,
    discount: 0,
    totalAmount: 3800,
    status: 'paid',
    issueDate: '2026-08-25',
    dueDate: '2026-09-08',
    paidAt: '2026-09-06',
  },
  {
    id: 'inv_5',
    invoiceNumber: 'INV-2026-005',
    client: 'Nexus AI Labs',
    project: 'Natural Language Search Microservice',
    subtotal: 1500,
    taxRate: 0,
    taxAmount: 0,
    discount: 0,
    totalAmount: 1500,
    status: 'overdue',
    issueDate: '2026-08-20',
    dueDate: '2026-09-03',
    paidAt: null,
  },
];

export default function Invoices() {
  const [filter, setFilter] = useState('all');

  const filteredInvoices = mockInvoices.filter((inv) => {
    if (filter === 'all') return true;
    return inv.status === filter;
  });

  const totalBilled = mockInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPaid = mockInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPending = totalBilled - totalPaid;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid': return <span className="badge badge-paid">Paid</span>;
      case 'sent': return <span className="badge badge-sent">Sent</span>;
      case 'overdue': return <span className="badge badge-overdue">Overdue</span>;
      default: return <span className="badge badge-draft">Draft</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>Invoicing & Billing</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Automated line-item calculation, taxes, discounts, and Stripe payments (Day 11 API)
          </p>
        </div>

        <button className="btn-primary" onClick={() => alert('Generate Invoice modal - connects to POST /api/invoices/generate!')}>
          <Plus size={16} />
          <span>Generate Invoice</span>
        </button>
      </div>

      {/* 3 Financial Summary Cards */}
      <div className="grid-3">
        <div className="glass-card stat-card stat-indigo">
          <div className="stat-info">
            <span className="stat-label">Total Invoiced</span>
            <span className="stat-value">${totalBilled.toLocaleString()}</span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Gross billed across all clients</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-indigo">
            <Receipt size={22} />
          </div>
        </div>

        <div className="glass-card stat-card stat-emerald">
          <div className="stat-info">
            <span className="stat-label">Total Collected</span>
            <span className="stat-value">${totalPaid.toLocaleString()}</span>
            <span style={{ fontSize: '0.78rem', color: '#10b981' }}>Successfully received</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-emerald">
            <CreditCard size={22} />
          </div>
        </div>

        <div className="glass-card stat-card stat-amber">
          <div className="stat-info">
            <span className="stat-label">Outstanding Due</span>
            <span className="stat-value">${totalPending.toLocaleString()}</span>
            <span style={{ fontSize: '0.78rem', color: '#fbbf24' }}>Sent &amp; overdue receivables</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['all', 'paid', 'sent', 'overdue', 'draft'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              background: filter === tab ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.04)',
              color: filter === tab ? '#fff' : '#94a3b8',
              border: filter === tab ? 'none' : '1px solid var(--border-subtle)',
              transition: 'all 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client &amp; Project</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Subtotal</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#818cf8' }}>
                      {inv.invoiceNumber}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{inv.client}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{inv.project}</span>
                    </div>
                  </td>
                  <td style={{ color: '#cbd5e1' }}>{inv.issueDate}</td>
                  <td style={{ color: inv.status === 'overdue' ? '#fb7185' : '#cbd5e1' }}>
                    {inv.dueDate}
                  </td>
                  <td style={{ color: '#94a3b8' }}>${inv.subtotal.toLocaleString()}</td>
                  <td style={{ fontWeight: 800, color: '#fff' }}>${inv.totalAmount.toLocaleString()}</td>
                  <td>{getStatusBadge(inv.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary btn-sm" title="View Invoice">
                      <FileText size={14} />
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
