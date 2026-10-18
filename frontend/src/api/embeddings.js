import apiClient from './client';

export const getEmbeddingStatus = async (courseCode) => {
  const response = await apiClient.get('/dev/embeddings/status', { params: courseCode ? { course_code: courseCode } : {} });
  return response.data;
};
