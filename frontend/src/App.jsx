import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './context/AuthContext';
import { DeveloperLogin } from './pages/DeveloperLogin';
import { Dashboard } from './pages/Dashboard';
import { CourseMaterials } from './pages/CourseMaterials';
import { DeveloperLayout } from './components/layout/DeveloperLayout';
import { StudentCatalog } from './pages/StudentCatalog';
import { StudentCourse } from './pages/StudentCourse';
import { QuestionGeneration } from './pages/QuestionGeneration';
import { CoursesPage } from './pages/CoursesPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { MaterialProcessingDetail } from './pages/MaterialProcessingDetail';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
       <Routes>
        {/* Public student browsing (the backend does not yet support generation). */}
        <Route path="/" element={<StudentCatalog />} />
        <Route path="/course/:courseCode" element={<StudentCourse />} />
        <Route path="/generate" element={<QuestionGeneration />} />

        {/* Public developer login */}
        <Route path="/login" element={<DeveloperLogin />} />

        {/* Protected Developer Routes wrapped in DeveloperLayout */}
        <Route
          element={
            <RequireAuth>
              <DeveloperLayout />
            </RequireAuth>
          }
        >
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/materials/:materialId" element={<MaterialProcessingDetail />} />
          <Route path="/processing" element={<ProcessingPage />} />
          <Route path="/courses/:courseCode" element={<CourseMaterials />} />
        </Route>

        {/* Keep the developer portal available without making it the student home. */}
        <Route path="/dev" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
       </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
