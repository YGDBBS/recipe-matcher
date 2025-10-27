import React, { useState, useEffect, useRef } from 'react';
import type { Recipe } from '../context/RecipeContext';

// Speech Recognition API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
  }
}
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
// Voice recognition will be implemented with native browser API
import { useRecipe } from '../context/RecipeContext';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { api } from '../services/api';
import { pantryPersistence } from '../services/PantryService';

const IngredientInput: React.FC = () => {
  const { state, dispatch } = useRecipe();
  const { state: authState } = useAuth();
  const { addNotification } = useEvents();
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize voice recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsVoiceSupported(true);
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        addNotification({
          type: 'info',
          title: 'Voice Recognition',
          message: 'Listening for ingredients...',
        });
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        addNotification({
          type: 'success',
          title: 'Voice Input',
          message: `Heard: "${transcript}"`,
        });
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        
        let errorMessage = `Error: ${event.error}`;
        if (event.error === 'not-allowed') {
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please try again.';
        } else if (event.error === 'network') {
          errorMessage = 'Network error. Please check your connection.';
        }
        
        addNotification({
          type: 'error',
          title: 'Voice Recognition Error',
          message: errorMessage,
        });
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      setIsVoiceSupported(false);
    }
  }, [addNotification]);

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleAddIngredient = async () => {
    if (!inputValue.trim()) return;

    const ingredientName = inputValue.trim().toLowerCase();
    
    // Check if ingredient already exists
    if (state.userIngredients.some(ing => ing.name.toLowerCase() === ingredientName)) {
      setError('This ingredient is already in your pantry');
      return;
    }

    // Add ingredient using hybrid persistence
    const newIngredient = {
      name: ingredientName,
      quantity: 1,
      unit: 'piece',
    };

    try {
      const pantryItem = await pantryPersistence.addIngredient(
        newIngredient, 
        authState.isAuthenticated ? authState.token! : undefined
      );

      dispatch({ type: 'ADD_INGREDIENT', payload: pantryItem });
      setInputValue('');
      setError(null);

      // Add notification for ingredient added
      addNotification({
        type: 'success',
        title: 'Ingredient Added',
        message: `${ingredientName} has been added to your pantry`,
        data: { ingredient: pantryItem },
      });

      // Sync with backend if authenticated
      if (authState.isAuthenticated && authState.token) {
        pantryPersistence.syncWithBackend(authState.token);
      }
    } catch {
      setError('Failed to add ingredient. Please try again.');
      // Error adding ingredient
    }
  };

  const handleRemoveIngredient = async (ingredientName: string) => {
    try {
      await pantryPersistence.removeIngredient(
        ingredientName,
        authState.isAuthenticated ? authState.token! : undefined
      );

      dispatch({ type: 'REMOVE_INGREDIENT', payload: ingredientName });

      // Add notification for ingredient removed
      addNotification({
        type: 'info',
        title: 'Ingredient Removed',
        message: `${ingredientName} has been removed from your pantry`,
      });

      // Sync with backend if authenticated
      if (authState.isAuthenticated && authState.token) {
        pantryPersistence.syncWithBackend(authState.token);
      }
    } catch {
      setError('Failed to remove ingredient. Please try again.');
      console.error('Error removing ingredient');
    }
  };

  const handleSearchRecipes = async () => {
    if (state.userIngredients.length === 0) {
      setError('Please add some ingredients first');
      return;
    }

    setIsSearching(true);
    setError(null);
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const ingredientNames = state.userIngredients.map(ing => ing.name);
      
      // Check if user is authenticated
      if (!authState.isAuthenticated || !authState.token) {
        setError('Please sign in to search for recipes');
        return;
      }

      // Use the new enhanced fuzzy matching API
      const matchRequest = {
        userIngredients: ingredientNames,
        minMatchPercentage: 30, // Minimum 30% match
        limit: 20, // Limit to top 20 results
        dietaryRestrictions: [], // Can be extended later
        maxCookingTime: undefined, // No time limit
        difficultyLevel: undefined, // No difficulty filter
      };

      const matchResponse = await api.findMatchingRecipes(matchRequest, authState.token);
      
      if (matchResponse.error) {
        setError(`Failed to find matching recipes: ${matchResponse.error}`);
        return;
      }

      if (!matchResponse.data?.matches) {
        setError('No matching recipes found');
        return;
      }

      // The API already returns recipes with match percentages and ingredient analysis
      const matchedRecipes: Recipe[] = matchResponse.data.matches.map(recipe => ({
        recipeId: recipe.recipeId,
        title: recipe.title,
        description: recipe.description || '',
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        cookingTime: recipe.cookingTime,
        difficultyLevel: recipe.difficultyLevel || 'easy',
        servings: recipe.servings,
        dietaryTags: recipe.dietaryTags || [],
        imageUrl: recipe.imageUrl,
        matchPercentage: recipe.matchPercentage || 0,
        missingIngredients: recipe.missingIngredients || [],
        availableIngredients: recipe.matchedIngredients || [],
        userId: recipe.author || 'unknown',
        createdAt: new Date().toISOString(),
        rating: recipe.rating,
        reviewCount: recipe.reviewCount,
      }));

      dispatch({ type: 'SET_RECIPES', payload: matchedRecipes });

      // Add notification for successful search
      addNotification({
        type: 'success',
        title: 'Recipes Found!',
        message: `Found ${matchedRecipes.length} recipes matching your ingredients!`,
        data: { recipeCount: matchedRecipes.length },
      });
      
    } catch (error) {
      console.error('Error searching recipes:', error);
      setError('Failed to search recipes. Please try again.');
    } finally {
      setIsSearching(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddIngredient();
    }
  };

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom color="primary">
          Your Pantry
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Input Section */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Add ingredients to your pantry"
            placeholder="e.g., chicken, tomatoes, garlic..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleAddIngredient} disabled={!inputValue.trim()}>
                    <AddIcon />
                  </IconButton>
                  {isVoiceSupported && (
                    <Tooltip title={isListening ? "Stop listening" : "Start voice input"}>
                      <IconButton 
                        onClick={handleVoiceToggle}
                        color={isListening ? "error" : "default"}
                        disabled={isSearching}
                      >
                        {isListening ? <MicOffIcon /> : <MicIcon />}
                      </IconButton>
                    </Tooltip>
                  )}
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearchRecipes}
            disabled={state.userIngredients.length === 0 || isSearching}
            sx={{ mr: 2 }}
          >
            {isSearching ? <CircularProgress size={20} /> : 'Find Recipes'}
          </Button>
          
          {state.userIngredients.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={() => dispatch({ type: 'CLEAR_RECIPES' })}
            >
              Clear Results
            </Button>
          )}
        </Box>

        {/* Ingredients Display */}
        {state.userIngredients.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Ingredients ({state.userIngredients.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {state.userIngredients.map((ingredient, index) => (
                <Chip
                  key={index}
                  label={`${ingredient.name} (${ingredient.quantity} ${ingredient.unit})`}
                  onDelete={() => handleRemoveIngredient(ingredient.name)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {state.userIngredients.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {authState.isAuthenticated 
                ? "Add some ingredients to discover amazing recipes you can make!"
                : "Sign in to save your pantry and get personalized recipe recommendations!"
              }
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default IngredientInput;
