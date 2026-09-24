import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: '1.5rem',
      padding: '2rem',
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(139, 92, 246, 0.2))',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        color: '#fb7185',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 30px rgba(244, 63, 94, 0.25)',
      }}>
        <Compass size={40} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '420px' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', margin: 0 }}>
          404
        </h2>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
          Page Not Found
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
          The route you navigated to does not exist or may have been moved within the CRM workspace.
        </p>
      </div>

      <Link to="/" className="btn-primary" style={{ marginTop: '0.5rem' }}>
        <ArrowLeft size={16} />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
