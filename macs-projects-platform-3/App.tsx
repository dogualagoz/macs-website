import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-[#050B14] font-sans selection:bg-blue-500/30 selection:text-blue-200">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;