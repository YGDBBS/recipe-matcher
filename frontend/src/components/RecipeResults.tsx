import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  LinearProgress,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Rating,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  Star as StarIcon,
  Restaurant as RestaurantIcon,
} from '@mui/icons-material';
import { useRecipe } from '../context/RecipeContext';

const RecipeResults: React.FC = () => {
  const { state } = useRecipe();
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  const handleExpandRecipe = (recipeId: string) => {
    setExpandedRecipe(expandedRecipe === recipeId ? null : recipeId);
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'secondary'; // Fresh Green
      case 'medium': return 'primary'; // Tomato Red
      case 'hard': return 'error'; // Keep red for hard
      default: return 'default';
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'easy': return 'Easy';
      case 'medium': return 'Medium';
      case 'hard': return 'Hard';
      default: return level;
    }
  };

  if (state.loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Finding the perfect recipes for you...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (state.recipes.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <RestaurantIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No recipes found yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add some ingredients and search for recipes to get started!
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom color="primary">
        Recipe Matches ({state.recipes.length})
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
        {state.recipes.map((recipe) => (
          <Box key={recipe.recipeId}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                {/* Recipe Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600, flexGrow: 1 }}>
                    {recipe.title}
                  </Typography>
                  <IconButton onClick={() => handleExpandRecipe(recipe.recipeId)}>
                    {expandedRecipe === recipe.recipeId ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>

                {/* Match Percentage */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                      Match: {recipe.matchPercentage}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={recipe.matchPercentage}
                      sx={{ 
                        flexGrow: 1, 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: recipe.matchPercentage >= 80 ? '#4CAF50' : recipe.matchPercentage >= 60 ? '#FF6347' : '#f44336'
                        }
                      }}
                    />
                  </Box>
                </Box>

                {/* Recipe Info */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<TimeIcon />}
                    label={`${recipe.cookingTime} min`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    icon={<PeopleIcon />}
                    label={`${recipe.servings} servings`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={getDifficultyLabel(recipe.difficultyLevel)}
                    size="small"
                    color={getDifficultyColor(recipe.difficultyLevel)}
                    variant="outlined"
                  />
                </Box>

                {/* Rating */}
                {recipe.rating && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Rating value={recipe.rating} readOnly size="small" />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      ({recipe.reviewCount} reviews)
                    </Typography>
                  </Box>
                )}

                {/* Description */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {recipe.description}
                </Typography>

                {/* Available vs Missing Ingredients */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    You have ({recipe.availableIngredients.length}):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    {recipe.availableIngredients.map((ingredient, index) => (
                      <Chip
                        key={index}
                        label={ingredient}
                        size="small"
                        sx={{ 
                          backgroundColor: '#e8f5e8', // Light green background
                          color: '#2e7d32', // Dark green text
                          border: '1px solid #4caf50' // Green border
                        }}
                      />
                    ))}
                  </Box>

                  {recipe.missingIngredients.length > 0 && (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        Missing ({recipe.missingIngredients.length}):
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {recipe.missingIngredients.map((ingredient, index) => (
                          <Chip
                            key={index}
                            label={ingredient}
                            size="small"
                            sx={{ 
                              backgroundColor: '#ffebee', // Light red background
                              color: '#c62828', // Dark red text
                              border: '1px solid #f44336' // Red border
                            }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </Box>

                {/* Dietary Tags */}
                {recipe.dietaryTags.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Dietary:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {recipe.dietaryTags.map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Expandable Content */}
                <Collapse in={expandedRecipe === recipe.recipeId} timeout="auto" unmountOnExit>
                  <Divider sx={{ my: 2 }} />
                  
                  {/* Ingredients */}
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Ingredients:
                  </Typography>
                  <List dense>
                    {recipe.ingredients.map((ingredient, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={`${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`}
                        />
                      </ListItem>
                    ))}
                  </List>

                  {/* Instructions */}
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                    Instructions:
                  </Typography>
                  <List dense>
                    {recipe.instructions.map((instruction, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={`${index + 1}. ${instruction}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>

                {/* Action Buttons */}
                <Box sx={{ mt: 'auto', pt: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    View Full Recipe
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<StarIcon />}
                  >
                    Save Recipe
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default RecipeResults;
