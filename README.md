# LiveConvo - Conversation Co-Pilot

**Real-time AI guidance for your most important conversations**

LiveConvo is a browser-based SaaS application that provides intelligent, real-time assistance during calls and meetings. Upload context documents, get live guidance suggestions, and receive structured summaries instantly after your conversations end.

## 🎯 Vision

Transform how knowledge workers prepare for and conduct critical conversations by providing AI-powered guidance that learns from context and delivers actionable insights in real-time.

## ✨ Key Features

### 🚀 MVP Features
- **Context Upload**: Drag-and-drop PDFs, DOCX, TXT, and images (with OCR) up to 25MB
- **Live Audio Capture**: Browser-based microphone integration via WebRTC
- **Real-time Guidance**: AI-powered suggestion chips with <2s latency
- **Smart Transcription**: Real-time speech-to-text with Deepgram Nova-3 streaming API (default) or OpenAI Realtime API
- **Intelligent Summary System**: Multi-layered summary generation for single sessions and conversation chains
- **Conversation Continuity**: Continue previous conversations with full context awareness
- **Email Export**: One-click sharing of meeting summaries
- **Analytics Dashboard**: Talk time ratios and conversation insights

### 🎨 User Experience
- **Three-pane interface**: Context upload | Live transcript | Guidance suggestions
- **Color-coded guidance**: Ask (green), Clarify (yellow), Avoid (red)
- **One-click setup**: Upload docs and start recording in <30 seconds
- **Privacy-first**: Audio purged after summary generation
- **Comprehensive Summaries**: Detailed conversation review with TL;DR, follow-ups, and exports

### 📋 Summary & Review Features
- **TL;DR Section**: Quick overview for busy executives
- **AI Summary (Editable)**: Comprehensive overview with key points, decisions, and action items
- **Follow-up Manager**: Interactive task management with priorities and assignments
- **Full Transcript**: Expandable conversation transcript with speaker identification
- **Export Options**: PDF, Word, Text, and JSON formats with customizable content
- **Quick Stats**: Audio quality, transcription accuracy, participant count, and metadata

### 🔗 Conversation Chain Management
- **Multi-Session Conversations**: Link related sessions into conversation chains
- **Contextual Summaries**: Each new session builds on previous conversation history
- **Progress Tracking**: Monitor evolution and progress across multiple sessions
- **Smart Context Windows**: Automatically includes relevant context from previous sessions (configurable 1-5 sessions)
- **Chain Summaries**: Periodic comprehensive summaries covering entire conversation arcs
- **Action Item Continuity**: Track completion and progress of action items across sessions

## 🎯 Target Users

| Persona | Use Case | Key Value |
|---------|----------|-----------|
| **SaaS Sales Reps** | Multi-call sales cycles | Track decision-makers and objections across calls |
| **Freelance Consultants** | Project discovery & delivery | Maintain context across project phases |
| **Job Seekers** | Interview rounds | Remember interviewer feedback and follow-ups |
| **Account Managers** | Ongoing client relationships | Never lose conversation history or commitments |

## 🏗️ Technical Architecture

### Frontend
- **Framework**: Next.js 14 with React
- **Styling**: Tailwind CSS
- **Audio**: WebRTC for microphone capture
- **Real-time**: WebSocket connections for streaming

### Backend
- **API**: FastAPI with Python
- **Authentication**: OAuth 2.0 (Google/Email)
- **Billing**: Stripe integration
- **Storage**: S3/R2 with 24h TTL

### AI & ML
- **Speech-to-Text**: Deepgram streaming API (default) or OpenAI Realtime API
- **Vector Store**: Pinecone + Redis caching
- **LLM**: OpenAI GPT-4o with LangChain
- **Document Processing**: OCR for images, text extraction

### Infrastructure
- **Deployment**: Fly.io with GPU autoscaling
- **Monitoring**: Real-time performance tracking
- **Security**: AES-256 encryption at rest

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Docker (for local development)
- Redis instance
- OpenAI API key (for AI guidance)
- Deepgram API key (for transcription - recommended)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/liveconvo.git
   cd liveconvo
   ```

2. **Backend setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Environment variables**
   ```bash
   # Backend (.env)
   OPENAI_API_KEY=your_openai_key
   PINECONE_API_KEY=your_pinecone_key
   REDIS_URL=redis://localhost:6379
   DATABASE_URL=postgresql://user:pass@localhost/liveconvo
   STRIPE_SECRET_KEY=your_stripe_key
   
   # Frontend (.env.local)
   OPENAI_API_KEY=your_openai_key          # Required for AI guidance
   DEEPGRAM_API_KEY=your_deepgram_key      # Required for transcription (recommended)
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
   ```

### Running the Application

1. **Start the backend**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. **Start the frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Guidance Latency | ≤ 2s (95th percentile) |
| Summary Generation | ≤ 30s after call end |
| User Retention | 30% WAU/signups |
| Conversion Rate | ≥ 8% (free to paid) |
| NPS Score | ≥ 40 (first week) |

## 🛣️ Roadmap

### Sprint 0-1 (Weeks 1-2)
- [ ] Project scaffolding and authentication
- [ ] Context upload and processing pipeline
- [ ] Vector database integration

### Sprint 2-3 (Weeks 3-4)
- [ ] Live audio capture and streaming STT
- [ ] Real-time guidance suggestion engine
- [ ] Transcript display and management

### Sprint 4-5 (Weeks 5-6)
- [ ] Summary generation and export
- [ ] UI polish and user testing
- [ ] Performance optimization

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm test
```

### Test Coverage
- Unit tests for all core functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance tests for latency requirements

## 📁 Project Structure

```
liveconvo/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   │   ├── core/           # Core functionality
│   │   │   ├── models/         # Database models
│   │   │   └── services/       # Business logic
│   │   ├── tests/              # Backend tests
│   │   └── requirements.txt
│   ├── frontend/               # Next.js frontend
│   │   ├── components/         # React components
│   │   ├── pages/             # Next.js pages
│   │   ├── lib/               # Utilities
│   │   └── styles/            # Tailwind styles
│   ├── docs/                  # Documentation
│   ├── PRD.md                 # Product Requirements
│   └── README.md              # This file
```

## 🤝 Contributing

1. Check `TASK.md` for current priorities
2. Follow the code structure guidelines in `PLANNING.md`
3. Write tests for new features
4. Use conventional commits
5. Submit PRs with clear descriptions

### Code Standards
- **Python**: PEP8, type hints, docstrings
- **JavaScript**: ESLint, Prettier
- **Testing**: Pytest for backend, Jest for frontend
- **Documentation**: Update README for new features

## 🔒 Privacy & Security

- **Data Retention**: Audio deleted after summary generation
- **Encryption**: AES-256 at rest, TLS in transit
- **Compliance**: SOC-2 Type I readiness
- **Privacy Controls**: User-controlled data deletion

## 💰 Pricing

- **Free Tier**: 3 hours of audio processing per month
- **Pro Tier**: $39/month unlimited usage
- **Enterprise**: Custom pricing for teams

## 📞 Support

- **Documentation**: [docs.liveconvo.com](https://docs.liveconvo.com)
- **Support Email**: support@liveconvo.com
- **Status Page**: [status.liveconvo.com](https://status.liveconvo.com)

## 📄 License

This project is proprietary software. All rights reserved.

---

**Built with ❤️ by the LiveConvo team** 