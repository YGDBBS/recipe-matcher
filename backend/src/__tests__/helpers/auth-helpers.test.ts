import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { verify } from 'jsonwebtoken'
import { 
  loginUser, 
  registerUser, 
} from '../../helpers/auth-helpers'

// Mock jsonwebtoken
jest.mock('jsonwebtoken')
const mockVerify = verify as jest.MockedFunction<typeof verify>

describe('Auth Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('loginUser', () => {
    it('should return error for missing email', async () => {
      const loginData = { email: '', password: 'password' }
      const response = {
        statusCode: 200,
        headers: {},
        body: '',
        message: 'Login successful'
      }
      
      const result = await loginUser(loginData, response)
      
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({ error: 'Email and password are required' })
    })

    it('should return error for missing password', async () => {
      const loginData = { email: 'test@example.com', password: '' }
      const response = {
        statusCode: 200,
        headers: {},
        body: '',
        message: 'Login successful'
      }
      
      const result = await loginUser(loginData, response)
      
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
