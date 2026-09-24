import React from 'react';
import { Heart, GitBranch, Code, CheckCircle2, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span>&copy; {new Date().getFullYear()} FreelanceFlow CRM &amp; Project Tracker</span>
        <span>•</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981' }}>
          <CheckCircle2 size={14} />
          Din 12: React App &amp; Router Ready
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
          <Code size={14} /> Vite + React 19 + React Router v7
        </span>
        <span>•</span>
        <a 
          href="https://github.com/ahsanadeem840-ai/freelancer-crm-tracker" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a5b4fc' }}
        >
          <GitBranch size={14} />
          GitHub Repo
        </a>
      </div>
    </footer>
  );
}
