import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { AuthProvider } from '../context/AuthContext';
import * as coursesApi from '../api/courses';
import * as materialsApi from '../api/materials';
import * as embeddingsApi from '../api/embeddings';

vi.mock('../api/courses', () => ({
  getCourses: vi.fn(),
  createCourse: vi.fn(),
}));

vi.mock('../api/materials', () => ({
  getMaterials: vi.fn(),
}));

vi.mock('../api/embeddings', () => ({
  getEmbeddingStatus: vi.fn(),
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    materialsApi.getMaterials.mockResolvedValue([]);
    embeddingsApi.getEmbeddingStatus.mockResolvedValue(null);
  });

  it('renders loading state initially', () => {
    coursesApi.getCourses.mockReturnValue(new Promise(() => {}));

    render(
      <BrowserRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading workspace data/i)).toBeInTheDocument();
  });

  it('renders the empty recent courses state when no courses exist', async () => {
    coursesApi.getCourses.mockResolvedValueOnce([]);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No courses yet/i)).toBeInTheDocument();
      expect(screen.getByText(/No courses yet\. Create a course to get started/i)).toBeInTheDocument();
    });
  });

  it('renders list of courses in a grid when courses exist', async () => {
    coursesApi.getCourses.mockResolvedValueOnce([
      {
        id: '1',
        course_code: 'BCSE301',
        course_name: 'Database Management Systems',
        description: 'DBMS course',
      },
      {
        id: '2',
        course_code: 'BCSE302',
        course_name: 'Operating Systems',
        description: 'OS course',
      },
    ]);
    materialsApi.getMaterials.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('BCSE301')).toBeInTheDocument();
      expect(screen.getByText('Database Management Systems')).toBeInTheDocument();
      expect(screen.getByText('BCSE302')).toBeInTheDocument();
      expect(screen.getByText('Operating Systems')).toBeInTheDocument();
    });
  });

  it('opens Add Course modal when the create course button is clicked', async () => {
    coursesApi.getCourses.mockResolvedValueOnce([]);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No courses yet/i)).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /Create course/i });
    fireEvent.click(addBtn);

    expect(screen.getByText(/Add New Course/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. BCSE301/i)).toBeInTheDocument();
  });
});
