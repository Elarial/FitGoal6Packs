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
  weightGrams: number;             // Poids de référence pour la pesée
  dryWeightGrams?: number;         // Poids sec / cru (pour les aliments qui absorbent l'eau : riz, pâtes, avoine...)
  cookedWeightGrams?: number;      // Poids cuit / réhydraté équivalent
  unit?: string;                   // Unité affichée optionnelle (ex: 'g', 'ml', 'pièce')
  pieceCount?: number;             // Nombre de pièces calculé (ex: 3 pour 3 œufs)
  category: IngredientCategory;
  note?: string;                   // Précision (ex: 'en lanières', 'en dés')
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
  servings: number;                 // Nombre de portions de base (1 portion)
  difficulty: RecipeDifficulty;
  cookingMethod?: 'air_fryer' | 'pan' | 'blender' | 'no_cook'; // Mode de cuisson principal
  tags: string[];                   // 'high_protein', 'air_fryer', 'balanced', 'low_carb'...
  emoji: string;                    // Représentation visuelle
  ingredients: RecipeIngredient[];  // Ingrédients avec double pesée sec / cuit
  instructions: string[];           // Étapes avec instructions Air Fryer
  nutritionPerServing: RecipeNutrition;
}

export interface ScaledRecipe extends Recipe {
  scaleFactor: number;
  scaledIngredients: RecipeIngredient[];
  scaledNutrition: RecipeNutrition;
}
