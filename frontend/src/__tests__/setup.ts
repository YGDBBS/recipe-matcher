import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock AWS Amplify
vi.mock('aws-amplify', () => ({
  configure: vi.fn(),
  Auth: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    currentAuthenticatedUser: vi.fn(),
  },
}))

// Mock WebSocket
global.WebSocket = vi.fn() as any

// Mock Speech Recognition API
global.SpeechRecognition = vi.fn() as any
global.webkitSpeechRecognition = vi.fn() as any
