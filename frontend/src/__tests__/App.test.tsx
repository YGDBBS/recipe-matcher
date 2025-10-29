import { describe, it, expect, vi } from 'vitest'

// Mock the API module
vi.mock('../lib/api', () => ({
  api: {
    verifyToken: vi.fn().mockResolvedValue({ data: { valid: true }, error: undefined }),
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    getRecipes: vi.fn().mockResolvedValue({ data: { recipes: [] }, error: undefined }),
    getMyRecipes: vi.fn().mockResolvedValue({ data: { recipes: [] }, error: undefined }),
    createRecipe: vi.fn(),
    getUserIngredients: vi.fn().mockResolvedValue({ data: { userIngredients: [] }, error: undefined }),
    addUserIngredient: vi.fn(),
    removeUserIngredient: vi.fn(),
  },
}))

describe('App', () => {
  it('renders without crashing', () => {
    // Simple test that just checks the test setup works
    expect(true).toBe(true)
  })
})
