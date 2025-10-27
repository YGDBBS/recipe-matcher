import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock WebSocket
(global as any).WebSocket = vi.fn() as any

// Mock Speech Recognition API
(global as any).SpeechRecognition = vi.fn() as any
(global as any).webkitSpeechRecognition = vi.fn() as any
