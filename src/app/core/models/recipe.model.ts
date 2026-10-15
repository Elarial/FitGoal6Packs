export type MealCategory = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export type IngredientCategory =
  | 'protein'     // Poulet, oeufs, poisson, tofu, whey...
  | 'carb'        // Flocons d'avoine, riz, patate douce, quinoa...
  | 'fat'         // Huile d'olive, avocat, amandes, beurre de cacahuète...
  | 'vegetable'   // Brocolis, épinards, tomates, courgettes...
  | 'fruit'       // Bananes, baies, pommes...
  | 'dairy'       // Fromage blanc, skyr, feta, lait...
  | 'seasoning';  // Épices, herbes, ail, jus de citron...

export interface RecipeIngredient {
  name: string;
  weightGrams: number;       // Poids brut en grammes
  unit?: string;             // Unité affichée optionnelle (ex: 'g', 'ml', 'pièce')
  category: IngredientCategory;
  note?: string;             // Précision (ex: 'râpé', 'égoutté', 'en dés')
}

export interface RecipeNutrition {
  calories: number;          // kcal
  protein: number;           // g
  carbs: number;             // g
  fats: number;              // g
  fiber?: number;            // g
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  mealCategories: MealCategory[];   // Peut convenir au déjeuner et au dîner
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;                 // Nombre de portions de base (généralement 1)
  difficulty: RecipeDifficulty;
  tags: string[];                   // 'high_protein', 'balanced', 'low_carb', 'express', 'vegetarian'...
  emoji: string;                    // Représentation visuelle
  ingredients: RecipeIngredient[];  // Ingrédients avec grammages
  instructions: string[];           // Étapes de préparation claires
  nutritionPerServing: RecipeNutrition;
}

export interface ScaledRecipe extends Recipe {
  scaleFactor: number;
  scaledIngredients: RecipeIngredient[];
  scaledNutrition: RecipeNutrition;
}
