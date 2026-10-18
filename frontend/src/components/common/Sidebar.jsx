import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, LogOut, Folder, RefreshCw, Menu, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Courses', path: '/courses', icon: BookOpen },
    { name: 'Materials', path: '/materials', icon: Folder },
    { name: 'Processing', path: '/processing', icon: RefreshCw },
  ];

  return (
    <aside className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="admin-side-top">
        <button className="admin-brand" onClick={() => navigate('/dashboard')} title="HOTS Admin">
          <span className="admin-brand-mark">H</span><span className="admin-brand-name">HOTS <b>Admin</b></span>
        </button>
        <button className="admin-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={19} />}
        </button>
        <ThemeToggle className="admin-theme-toggle" />
      </div>
      <p className="admin-nav-label">Workspace</p>
      <nav className="admin-nav">
        {navItems.map(({ name, path, icon: Icon }) => <NavLink key={path} to={path} title={collapsed ? name : undefined} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
          <Icon size={19} /><span>{name}</span>
        </NavLink>)}
      </nav>
      <div className="admin-sidebar-bottom">
        <div className="admin-user"><span className="admin-avatar">{(user || 'A').slice(0, 1).toUpperCase()}</span><span className="admin-user-copy"><b>{user || 'Administrator'}</b><small>Developer</small></span></div>
        <button className="admin-nav-link admin-logout" onClick={() => { logout(); navigate('/login'); }} title={collapsed ? 'Sign out' : undefined}><LogOut size={18} /><span>Sign out</span></button>
      </div>
    </aside>
  );
};
