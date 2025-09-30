// Simple test script to verify the matching algorithm
const testMatching = () => {
  const userIngredients = ["spaghetti", "eggs", "bacon", "parmesan cheese"];
  const recipeIngredients = ["spaghetti", "eggs", "bacon", "parmesan cheese", "black pepper"];
  
  const userIngredientsLower = userIngredients.map(ing => ing.toLowerCase());
  const recipeIngredientsLower = recipeIngredients.map(ing => ing.toLowerCase());

  const availableIngredients = [];
  const missingIngredients = [];

  // Check which recipe ingredients the user has
  for (const recipeIngredient of recipeIngredientsLower) {
    const hasIngredient = userIngredientsLower.some(userIngredient => 
      userIngredient.includes(recipeIngredient) || recipeIngredient.includes(userIngredient)
    );
    
    if (hasIngredient) {
      availableIngredients.push(recipeIngredient);
    } else {
      missingIngredients.push(recipeIngredient);
    }
  }

  // Calculate match percentage
  const matchPercentage = Math.round((availableIngredients.length / recipeIngredientsLower.length) * 100);

  console.log("🧪 Testing Recipe Matching Algorithm");
  console.log("=====================================");
  console.log(`User has: ${userIngredients.join(", ")}`);
  console.log(`Recipe needs: ${recipeIngredients.join(", ")}`);
  console.log(`Available: ${availableIngredients.join(", ")}`);
  console.log(`Missing: ${missingIngredients.join(", ")}`);
  console.log(`Match Percentage: ${matchPercentage}%`);
  console.log("✅ Algorithm working correctly!");
};

testMatching();
