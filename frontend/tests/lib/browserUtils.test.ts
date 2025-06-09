import { getBrowserInfo, isFullySupported, getBrowserRecommendation } from '@/lib/browserUtils';

describe('browserUtils', () => {
  const originalUserAgent = navigator.userAgent;
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    // Reset navigator properties
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      writable: true,
      configurable: true
    });
  });

  describe('getBrowserInfo', () => {
    it('detects Chrome correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        configurable: true
      });

      const info = getBrowserInfo();
      expect(info.browser).toBe('chrome');
      expect(info.version).toBe(120);
    });

    it('detects Firefox correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        configurable: true
      });

      const info = getBrowserInfo();
      expect(info.browser).toBe('firefox');
      expect(info.version).toBe(120);
    });

    it('detects Safari correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        configurable: true
      });

      const info = getBrowserInfo();
      expect(info.browser).toBe('safari');
      expect(info.version).toBe(17);
    });

    it('detects Edge correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        configurable: true
      });

      const info = getBrowserInfo();
      expect(info.browser).toBe('edge');
      expect(info.version).toBe(120);
    });
  });

  describe('isFullySupported', () => {
    const mockWebRTC = {
      getUserMedia: jest.fn(),
    };

    it('returns true for Chrome 90+', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/95.0.0.0 Safari/537.36',
        configurable: true
      });
      Object.defineProperty(navigator, 'mediaDevices', {
        value: mockWebRTC,
        configurable: true
      });
      Object.defineProperty(window, 'RTCPeerConnection', {
        value: jest.fn(),
        configurable: true
      });

      expect(isFullySupported()).toBe(true);
    });

    it('returns false for Chrome below 90', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/89.0.0.0 Safari/537.36',
        configurable: true
      });
      Object.defineProperty(navigator, 'mediaDevices', {
        value: mockWebRTC,
        configurable: true
      });

      expect(isFullySupported()).toBe(false);
    });

    it('returns false for browsers without WebRTC', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
        configurable: true
      });
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true
      });

      expect(isFullySupported()).toBe(false);
    });

    it('returns true for Edge 90+', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 Edg/95.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'mediaDevices', {
        value: mockWebRTC,
        configurable: true
      });
      Object.defineProperty(window, 'RTCPeerConnection', {
        value: jest.fn(),
        configurable: true
      });

      expect(isFullySupported()).toBe(true);
    });
  });

  describe('getBrowserRecommendation', () => {
    const mockWebRTC = {
      getUserMedia: jest.fn(),
    };

    beforeEach(() => {
      Object.defineProperty(window, 'RTCPeerConnection', {
        value: jest.fn(),
        configurable: true
      });
    });

    it('returns WebRTC message when WebRTC is not supported', () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true
      });

      const message = getBrowserRecommendation();
      expect(message).toContain('audio features');
      expect(message).toContain('Google Chrome');
    });

    it('returns Firefox-specific message', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Firefox/120.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'mediaDevices', {
        value: mockWebRTC,
        configurable: true
      });

      const message = getBrowserRecommendation();
      expect(message).toContain('Firefox');
      expect(message).toContain('limited support');
    });

    it('returns Safari-specific message', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Version/17.0 Safari/605.1.15',
        configurable: true
      });
      Object.defineProperty(navigator, 'mediaDevices', {
        value: mockWebRTC,
        configurable: true
      });

      const message = getBrowserRecommendation();
      expect(message).toContain('Safari');
      expect(message).toContain('compatibility issues');
    });

    it('returns update message for old Chrome', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/85.0.0.0 Safari/537.36',
        configurable: true
      });
      Object.defineProperty(navigator, 'mediaDevices', {
        value: mockWebRTC,
        configurable: true
      });

      const message = getBrowserRecommendation();
      expect(message).toContain('update Google Chrome');
    });
  });
});