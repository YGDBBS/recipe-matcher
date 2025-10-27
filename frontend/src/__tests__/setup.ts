import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock WebSocket
Object.assign(globalThis, { WebSocket: vi.fn() })

// Mock Speech Recognition API
Object.assign(globalThis, { 
  SpeechRecognition: vi.fn(),
  webkitSpeechRecognition: vi.fn() 
})
