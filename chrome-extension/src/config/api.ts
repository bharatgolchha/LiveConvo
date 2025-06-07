// API configuration for Chrome extension
export const API_CONFIG = {
  // Change this to your local backend URL
  baseUrl: 'http://localhost:3000',
  
  // API endpoints
  endpoints: {
    sessions: '/api/sessions',
    sessionFinalize: (id: string) => `/api/sessions/${id}/finalize`,
    guidance: '/api/guidance',
    chatGuidance: '/api/chat-guidance',
    documents: '/api/documents',
    transcript: (id: string) => `/api/sessions/${id}/transcript`,
  }
};