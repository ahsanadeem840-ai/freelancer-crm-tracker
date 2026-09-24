import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  MoreHorizontal, 
  CheckCircle2, 
  AlertCircle,
  FolderKanban,
  ArrowRight
} from 'lucide-react';

const initialTasks = [
  { id: 't1', title: 'Setup Stripe webhook signature validation', project: 'Fintech Crypto API', status: 'todo', priority: 'high', hours: 4 },
  { id: 't2', title: 'Optimize MongoDB indexes on clientId compound query', project: 'HealthTech App', status: 'todo', priority: 'medium', hours: 2 },
  { id: 't3', title: 'Implement JWT refresh token cookie rotation', project: 'CyberCore Gateway', status: 'in_progress', priority: 'high', hours: 6 },
  { id: 't4', title: 'Responsive Navbar with Mobile Drawer', project: 'SaaS Marketing Redesign', status: 'in_progress', priority: 'medium', hours: 3 },
  { id: 't5', title: 'Line items automated tax and discount calculator', project: 'Invoice Builder', status: 'review', priority: 'high', hours: 5 },
  { id: 't6', title: 'User authentication & RBAC middleware guards', project: 'CRM Core', status: 'done', priority: 'high', hours: 8 },
  { id: 't7', title: 'Setup Mongoose Schema relationships & ERD', project: 'Database Blueprint', status: 'done', priority: 'medium', hours: 4 },
];

const columns = [
  { id: 'todo', title: 'To Do', color: '#60a5fa' },
  { id: 'in_progress', title: 'In Progress', color: '#818cf8' },
  { id: 'review', title: 'Under Review', color: '#fbbf24' },
  { id: 'done', title: 'Completed', color: '#34d399' },
];

export default function Tasks() {
  const [tasks, setTasks] = useState(initialTasks);

  const moveTask = (taskId, nextStatus) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
  };

  const getNextStatus = (current) => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'review';
    if (current === 'review') return 'done';
    return 'todo';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>Kanban Task Board</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Visual agile task management, column states, and sprint tracking (Day 10 API)
          </p>
        </div>

        <button className="btn-primary" onClick={() => alert('New Task - connects to POST /api/tasks!')}>
          <Plus size={16} />
          <span>New Task</span>
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="kanban-board">
        {columns.map((col) => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-title">
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }} />
                  <span>{col.title}</span>
                </span>
                <span className="kanban-col-count">{colTasks.length}</span>
              </div>

              <div className="kanban-card-list">
                {colTasks.map((task) => (
                  <div key={task.id} className="kanban-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className={`badge badge-${task.priority}`}>
                        {task.priority}
                      </span>
                      <button 
                        onClick={() => moveTask(task.id, getNextStatus(task.status))}
                        style={{
                          fontSize: '0.7rem',
                          color: '#818cf8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          background: 'rgba(99, 102, 241, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                        title={`Advance to ${getNextStatus(task.status)}`}
                      >
                        <span>Move</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>

                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '0.65rem' }}>
                      {task.title}
                    </h4>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#cbd5e1' }}>
                        <FolderKanban size={12} color="#6366f1" />
                        <span style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.project}
                        </span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> {task.hours}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
