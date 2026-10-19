import apiClient from './client';

export const getGenerationCourses = async () => (await apiClient.get('/questions/courses')).data;
export const getGeneratedQuestions = async (courseCode) =>
  (await apiClient.get('/questions', { params: { course_code: courseCode } })).data;
export const generateQuestions = async (options) =>
  (await apiClient.post('/questions/generate', options)).data;
