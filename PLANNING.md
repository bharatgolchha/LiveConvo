# LiveConvo - Architecture & Planning Guide

## 🏗️ Architecture Overview

LiveConvo follows a **microservices-inspired monolithic architecture** with clear separation of concerns between frontend, backend API, and specialized AI services.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   AI Services   │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (Whisper +    │
│                 │    │                 │    │    GPT-4o)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Browser  │    │   PostgreSQL +  │    │   Vector Store  │
│   (WebRTC +     │    │   Redis Cache   │    │   (Pinecone)    │
│    WebSocket)   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 📁 Project Structure

### Root Directory Layout
```
liveconvo/
├── backend/                    # Python FastAPI backend
├── frontend/                   # Next.js React frontend  
├── ai-services/               # Specialized AI microservices
├── docs/                      # Documentation
├── docker/                    # Docker configurations
├── scripts/                   # Development & deployment scripts
├── tests/                     # Cross-system integration tests
├── .github/                   # GitHub workflows
├── PRD.md                     # Product Requirements Document
├── README.md                  # Project overview
├── TASK.md                    # Task tracking
├── PLANNING.md                # This file
├── schema.md                  # Database schema documentation
└── temp_schema_dump.sql       # Latest database schema
```

### Backend Structure (`/backend`)
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI app entry point
│   ├── config.py             # Configuration management
│   ├── database.py           # Database connection setup
│   ├── dependencies.py       # Shared dependencies
│   │
│   ├── api/                  # API route handlers
│   │   ├── __init__.py
│   │   ├── deps.py           # API dependencies
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── upload.py         # File upload endpoints
│   │   ├── sessions.py       # Session management
│   │   ├── guidance.py       # Real-time guidance API
│   │   └── summaries.py      # Summary generation
│   │
│   ├── core/                 # Core business logic
│   │   ├── __init__.py
│   │   ├── auth.py           # Authentication logic
│   │   ├── security.py       # Security utilities
│   │   ├── config.py         # Core configuration
│   │   └── events.py         # Event handling
│   │
│   ├── models/               # Database models (SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── user.py           # User model
│   │   ├── session.py        # Session model
│   │   ├── document.py       # Document model
│   │   └── summary.py        # Summary model
│   │
│   ├── schemas/              # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py           # User schemas
│   │   ├── session.py        # Session schemas
│   │   ├── document.py       # Document schemas
│   │   └── summary.py        # Summary schemas
│   │
│   ├── services/             # Business logic services
│   │   ├── __init__.py
│   │   ├── auth_service.py   # Authentication service
│   │   ├── upload_service.py # File upload service
│   │   ├── vector_service.py # Vector database service
│   │   ├── stt_service.py    # Speech-to-text service
│   │   ├── guidance_service.py # AI guidance service
│   │   └── summary_service.py  # Summary generation service
│   │
│   └── utils/                # Utility functions
│       ├── __init__.py
│       ├── file_utils.py     # File processing utilities
│       ├── vector_utils.py   # Vector operations
│       └── ai_utils.py       # AI/ML utilities
│
├── tests/                    # Backend tests
│   ├── __init__.py
│   ├── conftest.py          # Pytest configuration
│   ├── test_auth.py         # Authentication tests
│   ├── test_upload.py       # Upload functionality tests
│   ├── test_guidance.py     # Guidance service tests
│   └── test_summaries.py    # Summary generation tests
│
├── alembic/                 # Database migrations
├── requirements.txt         # Python dependencies
├── requirements-dev.txt     # Development dependencies
├── Dockerfile              # Backend Docker configuration
└── .env.example            # Environment variables example
```

### Frontend Structure (`/frontend`)
```
frontend/
├── components/              # Reusable React components
│   ├── ui/                 # Basic UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Card.tsx
│   │
│   ├── auth/               # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── AuthGuard.tsx
│   │
│   ├── upload/             # File upload components
│   │   ├── FileUpload.tsx
│   │   ├── FileList.tsx
│   │   └── UploadProgress.tsx
│   │
│   ├── session/            # Session management components
│   │   ├── SessionControl.tsx
│   │   ├── AudioCapture.tsx
│   │   └── SessionStatus.tsx
│   │
│   ├── guidance/           # Guidance display components
│   │   ├── GuidancePanel.tsx
│   │   ├── GuidanceChip.tsx
│   │   └── GuidanceHistory.tsx
│   │
│   ├── transcript/         # Transcript components
│   │   ├── TranscriptView.tsx
│   │   ├── TranscriptLine.tsx
│   │   └── TranscriptSearch.tsx
│   │
│   └── summary/            # Summary components
│       ├── SummaryView.tsx
│       ├── SummaryExport.tsx
│       └── ActionItems.tsx
│
├── pages/                  # Next.js pages
│   ├── _app.tsx           # App component
│   ├── _document.tsx      # Document component
│   ├── index.tsx          # Landing page
│   ├── login.tsx          # Login page
│   ├── dashboard.tsx      # Main dashboard
│   ├── session/           # Session pages
│   │   ├── [id].tsx      # Session detail page
│   │   └── new.tsx       # New session page
│   └── api/               # API routes (if needed)
│
├── lib/                   # Utility libraries
│   ├── api.ts            # API client configuration
│   ├── auth.ts           # Authentication utilities
│   ├── websocket.ts      # WebSocket management
│   ├── audio.ts          # Audio capture utilities
│   └── storage.ts        # Local storage utilities
│
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts        # Authentication hook
│   ├── useWebSocket.ts   # WebSocket hook
│   ├── useAudioCapture.ts # Audio capture hook
│   └── useGuidance.ts    # Guidance hook
│
├── types/                 # TypeScript type definitions
│   ├── auth.ts           # Authentication types
│   ├── session.ts        # Session types
│   ├── guidance.ts       # Guidance types
│   └── api.ts            # API response types
│
├── styles/               # Styling
│   ├── globals.css       # Global styles
│   └── components.css    # Component-specific styles
│
├── public/               # Static assets
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript configuration
```

---

## 🎯 Naming Conventions

### Files & Directories
- **Python files**: `snake_case.py`
- **TypeScript/React files**: `PascalCase.tsx` (components), `camelCase.ts` (utilities)
- **Directories**: `kebab-case` for features, `snake_case` for Python modules
- **Database tables**: `snake_case` (plural: `users`, `sessions`, `documents`)
- **API endpoints**: `kebab-case` (`/api/auth/login`, `/api/upload-file`)

### Code Conventions
- **Functions/Methods**: `snake_case` (Python), `camelCase` (TypeScript)
- **Classes**: `PascalCase` in both languages
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Environment variables**: `SCREAMING_SNAKE_CASE`
- **React components**: `PascalCase`
- **React hooks**: `camelCase` starting with `use`

### Database Schema
- **Primary keys**: `id` (UUID v4)
- **Foreign keys**: `{table_name}_id`
- **Timestamps**: `created_at`, `updated_at` (always include)
- **Soft delete**: `deleted_at` (nullable timestamp)
- **Boolean flags**: `is_active`, `has_*`, `can_*`

---

## 🔧 Development Standards

### Python (Backend)
```python
"""
Module docstring with brief description.

This module handles [specific functionality].
"""

from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

class ExampleService:
    """
    Brief class description.
    
    Handles [specific responsibility] with [key features].
    """
    
    def __init__(self, config: Config) -> None:
        """Initialize the service with configuration."""
        self.config = config
        
    async def process_data(
        self, 
        data: dict, 
        user_id: str,
        options: Optional[dict] = None
    ) -> ProcessResult:
        """
        Process incoming data for a user.
        
        Args:
            data: Input data to process
            user_id: Unique identifier for the user
            options: Optional processing parameters
            
        Returns:
            ProcessResult: Processed data with metadata
            
        Raises:
            ProcessingError: When data processing fails
        """
        logger.info(f"Processing data for user {user_id}")
        
        # Reason: Validate input before processing to prevent errors downstream
        if not self._validate_data(data):
            raise ProcessingError("Invalid input data")
            
        result = await self._perform_processing(data, options)
        return result
```

### TypeScript (Frontend)
```typescript
/**
 * Custom hook for managing audio capture functionality.
 * 
 * Provides methods to start/stop recording and access audio stream.
 */
export const useAudioCapture = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      // Reason: Request user permission before accessing microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      
      setAudioStream(stream);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw new Error('Microphone access denied');
    }
  }, []);
  
  return { isRecording, audioStream, startRecording };
};
```

---

## 🎨 UI/UX Patterns

### Design System
- **Colors**: Tailwind CSS palette with custom brand colors
- **Typography**: Inter font family for consistency
- **Spacing**: 4px base unit (Tailwind spacing scale)
- **Border radius**: 8px default, 4px for small elements
- **Shadows**: Subtle elevation with Tailwind shadow utilities

### Component Patterns
```typescript
// Standard component structure
interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Component: React.FC<ComponentProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  const baseClasses = 'rounded-lg font-medium transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

### Layout Structure
- **Header**: Navigation, user menu, session controls
- **Main Content**: Three-pane layout (context | transcript | guidance)
- **Footer**: Status indicators, privacy controls
- **Modals**: Confirmation dialogs, settings, export options

---

## 🔒 Security Patterns

### Authentication
- **JWT tokens**: Short-lived access tokens (15 min) + refresh tokens (7 days)
- **OAuth 2.0**: Google/Email providers
- **Session management**: Secure HTTP-only cookies
- **CSRF protection**: Built-in FastAPI CSRF middleware

### Data Protection
- **Encryption**: AES-256 for data at rest
- **TLS**: 1.3 for data in transit
- **Audio privacy**: Automatic deletion after processing
- **User data**: GDPR-compliant deletion workflows

### API Security
- **Rate limiting**: Per-user and per-endpoint limits
- **Input validation**: Pydantic schemas for all inputs
- **CORS**: Restricted to allowed origins
- **Content Security Policy**: Strict CSP headers

---

## 🧪 Testing Strategy

### Unit Tests
- **Backend**: Pytest with >80% coverage requirement
- **Frontend**: Jest + React Testing Library
- **Test structure**: Arrange, Act, Assert pattern
- **Mocking**: External services mocked in tests

### Integration Tests
- **API tests**: Full request/response cycle testing
- **Database tests**: Real database with test data
- **WebSocket tests**: Real-time communication testing

### E2E Tests
- **User flows**: Critical paths (upload → record → summary)
- **Browser testing**: Chrome/Edge compatibility
- **Performance testing**: Latency and throughput validation

---

## 📊 Monitoring & Observability

### Logging
- **Structured logging**: JSON format with correlation IDs
- **Log levels**: DEBUG (dev), INFO (prod), ERROR (always)
- **Sensitive data**: Never log user content or audio

### Metrics
- **Performance**: Response times, throughput, error rates
- **Business**: User engagement, conversion funnels
- **Infrastructure**: CPU, memory, disk usage

### Alerting
- **Critical errors**: Immediate notification
- **Performance degradation**: Latency > 2s threshold
- **Usage spikes**: Unexpected traffic patterns

---

**Last Updated:** 2025-01-26  
**Next Review:** Before each major architecture decision 