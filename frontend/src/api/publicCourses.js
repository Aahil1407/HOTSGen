import apiClient from './client';

export const getPublicCourses = async () => {
  const response = await apiClient.get('/courses');
  return response.data;
};

export const getPublicCourseTopics = async (courseCode) => {
  const response = await apiClient.get(`/courses/${encodeURIComponent(courseCode)}/topics`);
  return response.data;
};
