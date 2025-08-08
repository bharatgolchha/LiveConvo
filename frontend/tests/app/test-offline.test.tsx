import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TestOfflinePage from '@/app/test-offline/page'

describe('TestOfflinePage', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders and uploads file then displays diarized segments', async () => {
    const mockSegments = [
      { text: 'Hello there', speaker: 'speaker_1', start: 0, end: 1.5, confidence: 0.95 },
      { text: 'Hi! How are you?', speaker: 'speaker_2', start: 1.6, end: 3.0, confidence: 0.92 },
    ]

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ segments: mockSegments })
    } as any)

    render(<TestOfflinePage />)

    const input = screen.getByLabelText('upload-file') as HTMLInputElement
    const file = new File(['(⌐□_□)'], 'test.wav', { type: 'audio/wav' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Hello there')).toBeInTheDocument()
      expect(screen.getByText('Hi! How are you?')).toBeInTheDocument()
    })
  })

  test('shows error on API failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Deepgram transcription failed' })
    } as any)

    render(<TestOfflinePage />)
    const input = screen.getByLabelText('upload-file') as HTMLInputElement
    const file = new File(['x'], 'bad.mp3', { type: 'audio/mpeg' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Deepgram transcription failed')).toBeInTheDocument()
    })
  })
})


