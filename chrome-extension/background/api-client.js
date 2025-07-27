class LivePromptAPI {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://liveprompt.ai/api';
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async createSession(meetingData) {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        title: meetingData.title,
        platform: meetingData.platform,
        meeting_url: meetingData.url,
        meeting_id: meetingData.meetingId,
        scheduled_start: meetingData.scheduledStart
      })
    });
  }

  async endSession(sessionId) {
    return this.request(`/sessions/${sessionId}/finalize`, {
      method: 'POST'
    });
  }

  async getSession(sessionId) {
    return this.request(`/sessions/${sessionId}`);
  }

  async getSessions(limit = 10) {
    return this.request(`/sessions?limit=${limit}`);
  }

  async getActiveSessions() {
    return this.request('/sessions?status=active');
  }

  async addContext(sessionId, context) {
    return this.request(`/sessions/${sessionId}/context`, {
      method: 'POST',
      body: JSON.stringify({ content: context })
    });
  }

  async getGuidance(sessionId, prompt) {
    return this.request('/guidance', {
      method: 'POST',
      body: JSON.stringify({ 
        session_id: sessionId,
        prompt: prompt 
      })
    });
  }

  async getSummary(sessionId) {
    return this.request(`/sessions/${sessionId}/summary`);
  }
}

export default LivePromptAPI;