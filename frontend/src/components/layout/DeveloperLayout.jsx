import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';

export const DeveloperLayout = () => {
  return (
    <div className="admin-shell">
      <Sidebar />
      <main className="admin-main"><Outlet /></main>
    </div>
  );
};
