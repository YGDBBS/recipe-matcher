import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { verify } from 'jsonwebtoken'
import { 
  loginUser, 
  registerUser, 
  extractUserIdFromToken 
} from '../../helpers/auth-helpers'

// Mock jsonwebtoken
jest.mock('jsonwebtoken')
const mockVerify = verify as jest.MockedFunction<typeof verify>

describe('Auth Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('extractUserIdFromToken', () => {
    it('should extract user ID from valid token', () => {
      const token = 'Bearer valid-token'
      const decoded = { userId: 'user123' }
      
      mockVerify.mockReturnValue(decoded as any)
      
      const result = extractUserIdFromToken(token)
      
      expect(mockVerify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET)
      expect(result).toBe('user123')
    })

    it('should return null for invalid token', () => {
      const token = 'Bearer invalid-token'
      
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid token')
      })
      
      const result = extractUserIdFromToken(token)
      
      expect(result).toBeNull()
    })
  })

  describe('loginUser', () => {
    it('should return error for missing email', async () => {
      const loginData = { email: '', password: 'password' }
      const headers = {}
      
      const result = await loginUser(loginData, headers)
      
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({ error: 'Email and password are required' })
    })

    it('should return error for missing password', async () => {
      const loginData = { email: 'test@example.com', password: '' }
      const headers = {}
      
      const result = await loginUser(loginData, headers)
      
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({ error: 'Email and password are required' })
    })
  })

  describe('registerUser', () => {
    it('should return error for missing email', async () => {
      const userData = { email: '', password: 'password', username: 'testuser' }
      const headers = {}
      
      const result = await registerUser(userData, headers)
      
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({ error: 'Email, password, and username are required' })
    })

    it('should return error for missing password', async () => {
      const userData = { email: 'test@example.com', password: '', username: 'testuser' }
      const headers = {}
      
      const result = await registerUser(userData, headers)
      
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({ error: 'Email, password, and username are required' })
    })

    it('should return error for missing username', async () => {
      const userData = { email: 'test@example.com', password: 'password', username: '' }
      const headers = {}
      
      const result = await registerUser(userData, headers)
      
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({ error: 'Email, password, and username are required' })
    })
  })
})
