import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserCompatibilityNotice } from '@/components/ui/BrowserCompatibilityNotice';
import * as browserUtils from '@/lib/browserUtils';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock browserUtils
jest.mock('@/lib/browserUtils');

describe('BrowserCompatibilityNotice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  it('should not show notice if already dismissed', () => {
    mockSessionStorage.getItem.mockReturnValue('true');
    render(<BrowserCompatibilityNotice />);
    expect(screen.queryByText('Browser Compatibility Notice')).not.toBeInTheDocument();
  });

  it('should show notice for Firefox', () => {
    (browserUtils.detectBrowser as jest.Mock).mockReturnValue({
      isChrome: false,
      isFirefox: true,
      isSafari: false,
      isEdge: false,
      version: '91',
      hasWebRTC: true,
      hasGetUserMedia: true,
      isSupported: false
    });
    (browserUtils.getBrowserRecommendation as jest.Mock).mockReturnValue(
      'Firefox detected. For the best experience with real-time audio features, we recommend using Google Chrome or Microsoft Edge.'
    );

    render(<BrowserCompatibilityNotice />);
    expect(screen.getByText('Browser Compatibility Notice')).toBeInTheDocument();
    expect(screen.getByText(/Firefox detected/)).toBeInTheDocument();
  });

  it('should show notice for Safari', () => {
    (browserUtils.detectBrowser as jest.Mock).mockReturnValue({
      isChrome: false,
      isFirefox: false,
      isSafari: true,
      isEdge: false,
      version: '14',
      hasWebRTC: true,
      hasGetUserMedia: true,
      isSupported: false
    });
    (browserUtils.getBrowserRecommendation as jest.Mock).mockReturnValue(
      'Safari detected. Some audio features may have limited functionality. For the best experience, we recommend using Google Chrome or Microsoft Edge.'
    );

    render(<BrowserCompatibilityNotice />);
    expect(screen.getByText('Browser Compatibility Notice')).toBeInTheDocument();
    expect(screen.getByText(/Safari detected/)).toBeInTheDocument();
  });

  it('should not show notice for modern Chrome', () => {
    (browserUtils.detectBrowser as jest.Mock).mockReturnValue({
      isChrome: true,
      isFirefox: false,
      isSafari: false,
      isEdge: false,
      version: '120',
      hasWebRTC: true,
      hasGetUserMedia: true,
      isSupported: true
    });
    (browserUtils.getBrowserRecommendation as jest.Mock).mockReturnValue('');

    render(<BrowserCompatibilityNotice />);
    expect(screen.queryByText('Browser Compatibility Notice')).not.toBeInTheDocument();
  });

  it('should show notice for outdated Chrome', () => {
    (browserUtils.detectBrowser as jest.Mock).mockReturnValue({
      isChrome: true,
      isFirefox: false,
      isSafari: false,
      isEdge: false,
      version: '89',
      hasWebRTC: true,
      hasGetUserMedia: true,
      isSupported: false
    });
    (browserUtils.getBrowserRecommendation as jest.Mock).mockReturnValue(
      'Your browser version is outdated. Please update to the latest version for optimal performance and security.'
    );

    render(<BrowserCompatibilityNotice />);
    expect(screen.getByText('Browser Compatibility Notice')).toBeInTheDocument();
    expect(screen.getByText(/Your browser version is outdated/)).toBeInTheDocument();
  });

  it('should show notice for missing WebRTC support', () => {
    (browserUtils.detectBrowser as jest.Mock).mockReturnValue({
      isChrome: false,
      isFirefox: false,
      isSafari: false,
      isEdge: false,
      version: '',
      hasWebRTC: false,
      hasGetUserMedia: false,
      isSupported: false
    });
    (browserUtils.getBrowserRecommendation as jest.Mock).mockReturnValue(
      'Your browser lacks support for required audio features. Please use Google Chrome or Microsoft Edge.'
    );

    render(<BrowserCompatibilityNotice />);
    expect(screen.getByText('Browser Compatibility Notice')).toBeInTheDocument();
    expect(screen.getByText(/lacks support for required audio features/)).toBeInTheDocument();
  });

  it('should dismiss notice and save to sessionStorage', () => {
    (browserUtils.detectBrowser as jest.Mock).mockReturnValue({
      isChrome: false,
      isFirefox: true,
      isSafari: false,
      isEdge: false,
      version: '91',
      hasWebRTC: true,
      hasGetUserMedia: true,
      isSupported: false
    });
    (browserUtils.getBrowserRecommendation as jest.Mock).mockReturnValue(
      'Firefox detected. For the best experience with real-time audio features, we recommend using Google Chrome or Microsoft Edge.'
    );

    render(<BrowserCompatibilityNotice />);
    
    const dismissButton = screen.getByLabelText('Dismiss notice');
    fireEvent.click(dismissButton);

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('browserCompatibilityDismissed', 'true');
    expect(screen.queryByText('Browser Compatibility Notice')).not.toBeInTheDocument();
  });
});