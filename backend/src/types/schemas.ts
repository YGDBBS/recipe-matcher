import { z } from 'zod';

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
  
export const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    username: z.string().min(1),
    dietaryRestrictions: z.array(z.string()).optional(),
    preferences: z
      .object({
        cookingTime: z.number().int().positive().optional(),
        difficultyLevel: z.string().optional(),
      })
      .optional(),
});
  
export const UpdateProfileSchema = z.object({
    username: z.string().optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    preferences: z
      .object({
        cookingTime: z.number().int().positive().optional(),
        difficultyLevel: z.string().optional(),
      })
      .optional(),
});