import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { QuestionGeneration } from '../pages/QuestionGeneration';
import { generateQuestions, getGeneratedQuestions, getGenerationCourses } from '../api/questions';

vi.mock('../api/questions', () => ({
  generateQuestions: vi.fn(),
  getGeneratedQuestions: vi.fn(),
  getGenerationCourses: vi.fn(),
}));

const course = {
  course_code: 'BACSE202', course_name: 'Database Systems', units: [{
    id: 'BACSE202_U3', unit_number: 3, unit_name: 'Transactions', topics: [
      { id: 'BACSE202_U3_T1', topic_name: 'Concurrency Control', subtopics: [] },
    ],
  }],
};
const generated = {
  id: 'question-1', course_code: 'BACSE202', question_text: 'Analyze how two-phase locking handles a deadlock in a banking system.',
  answer: 'Abort and restart one transaction.', explanation: 'Releasing locks resolves the deadlock.',
  question_type: 'case scenario', bloom_level: 'Analyze', difficulty: 'medium', marks: 10,
  sources: [{ chunk_id: 'chunk-12345678', page_number: 14, unit_id: 'BACSE202_U3' }],
};

const renderPage = () => render(
  <MemoryRouter initialEntries={['/generate?course=BACSE202']}>
    <ThemeProvider><QuestionGeneration /></ThemeProvider>
  </MemoryRouter>,
);

describe('QuestionGeneration page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGenerationCourses.mockResolvedValue([course]);
    getGeneratedQuestions.mockResolvedValue([]);
  });

  it('loads generation-ready courses and syllabus options', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Generate HOTS questions' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'BACSE202 — Database Systems' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Concurrency Control' })).toBeInTheDocument();
  });

  it('submits options and displays generated answer and source reference', async () => {
    generateQuestions.mockResolvedValue({ course_code: 'BACSE202', context_count: 2, questions: [generated] });
    getGeneratedQuestions.mockResolvedValueOnce([]).mockResolvedValueOnce([generated]);
    renderPage();
    fireEvent.change(await screen.findByLabelText('Topic'), { target: { value: 'BACSE202_U3_T1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate 3 questions' }));

    await waitFor(() => expect(generateQuestions).toHaveBeenCalledWith(expect.objectContaining({
      course_code: 'BACSE202', unit_id: null, topic_id: 'BACSE202_U3_T1', count: 3, bloom_level: 'Analyze',
    })));
    expect(await screen.findByText(generated.question_text)).toBeInTheDocument();
    expect(screen.getByText('Abort and restart one transaction.')).toBeInTheDocument();
    expect(screen.getByText(/page 14/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Generated and saved 1 grounded question/);
  });
});
