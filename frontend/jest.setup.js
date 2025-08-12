import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.OPENROUTER_API_KEY = 'sk-or-test-key-for-testing'
process.env.DEEPGRAM_API_KEY = 'test-deepgram-key-for-testing'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Mock fetch globally
global.fetch = jest.fn()

// Mock Request and Response for Next.js API testing
// Note: Don't override Request in Node.js environment as NextRequest extends native Request
if (typeof window !== 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.body = init?.body || null;
    }
    
    async json() {
      return this.body ? JSON.parse(this.body) : {};
    }
    
    async text() {
      return this.body || '';
    }
  }
}

// Mock Response for tests
global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map(Object.entries(init?.headers || {}));
  }
  
  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }
  
  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock window.navigator for audio tests (only in browser environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'navigator', {
    value: {
      mediaDevices: {
        getUserMedia: jest.fn(),
      },
      userAgent: 'test',
    },
    writable: true,
  })

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
    },
    writable: true,
  })
}

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: jest.fn(() => ({
    frequencyBinCount: 1024,
    getByteFrequencyData: jest.fn(),
  })),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
  })),
  close: jest.fn(),
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0))
global.cancelAnimationFrame = jest.fn()

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
}) 

// Lightweight ESM dependency mocks to stabilize tests
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => <div>{Array.isArray(children) ? children.join('') : children}</div>,
}))

// Prevent ESM import issues from supabase client during tests
jest.mock('@supabase/supabase-js', () => {
  const stubChain = () => ({
    select: jest.fn(() => stubChain()),
    update: jest.fn(() => stubChain()),
    insert: jest.fn(() => stubChain()),
    delete: jest.fn(() => stubChain()),
    eq: jest.fn(() => stubChain()),
    order: jest.fn(() => stubChain()),
    single: jest.fn(async () => ({ data: null, error: null })),
    maybeSingle: jest.fn(async () => ({ data: null, error: null })),
    limit: jest.fn(() => stubChain()),
    range: jest.fn(async () => ({ data: [], count: 0, error: null })),
  })
  return {
    createClient: () => ({
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'test-user' } }, error: null })),
        getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      },
      from: jest.fn(() => stubChain()),
    }),
  }
})

// Mock Auth context to avoid provider requirement in isolated component tests
jest.mock('@/contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: { user: { id: 'test-user' } },
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
  AuthProvider: ({ children }) => children,
}))