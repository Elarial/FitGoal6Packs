import { Injectable, signal, computed } from '@angular/core';
import { Recipe, MealCategory, ScaledRecipe, RecipeIngredient } from '../models/recipe.model';
import { DEMO_RECIPES } from '../data/recipe.data';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  readonly recipes = signal<Recipe[]>(DEMO_RECIPES);
  readonly selectedCategory = signal<MealCategory | 'all'>('all');
  readonly searchQuery = signal<string>('');

  /**
   * Recettes filtrées réactivement par catégorie et mot-clé
   */
  readonly filteredRecipes = computed<Recipe[]>(() => {
    const list = this.recipes();
    const category = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter((recipe) => {
      const matchCategory =
        category === 'all' || recipe.mealCategories.includes(category);

      const matchQuery =
        !query ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(query));

      return matchCategory && matchQuery;
    });
  });

  setCategory(category: MealCategory | 'all'): void {
    this.selectedCategory.set(category);
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  getRecipeById(id: string): Recipe | undefined {
    return this.recipes().find((r) => r.id === id);
  }

  getRecipesForCategory(category: MealCategory): Recipe[] {
    return this.recipes().filter((r) => r.mealCategories.includes(category));
  }

  /**
   * Adapte proportionnellement les grammages d'une recette
   * (poids de référence, poids sec ET poids cuit)
   * pour atteindre exactement la cible calorique d'un repas de l'utilisateur.
   */
  scaleRecipeToTarget(recipe: Recipe, targetCalories: number): ScaledRecipe {
    const baseCalories = Math.max(recipe.nutritionPerServing.calories, 100);
    const factor = targetCalories > 0 ? targetCalories / baseCalories : 1;

    const scaledIngredients: RecipeIngredient[] = recipe.ingredients.map((ing) => {
      // Les assaisonnements et herbes ne doublent pas brutalement
      const isSeasoning = ing.category === 'seasoning';
      const weightFactor = isSeasoning ? Math.min(Math.max(factor, 0.8), 1.3) : factor;

      const scaledWeight = Math.round(ing.weightGrams * weightFactor);
      const scaledDryWeight =
        ing.dryWeightGrams != null
          ? Math.round(ing.dryWeightGrams * weightFactor)
          : undefined;
      const scaledCookedWeight =
        ing.cookedWeightGrams != null
          ? Math.round(ing.cookedWeightGrams * weightFactor)
          : undefined;

      return {
        ...ing,
        weightGrams: scaledWeight,
        dryWeightGrams: scaledDryWeight,
        cookedWeightGrams: scaledCookedWeight,
      };
    });

    return {
      ...recipe,
      scaleFactor: Number(factor.toFixed(2)),
      scaledIngredients,
      scaledNutrition: {
        calories: Math.round(recipe.nutritionPerServing.calories * factor),
        protein: Math.round(recipe.nutritionPerServing.protein * factor),
        carbs: Math.round(recipe.nutritionPerServing.carbs * factor),
        fats: Math.round(recipe.nutritionPerServing.fats * factor),
        fiber: recipe.nutritionPerServing.fiber
          ? Math.round(recipe.nutritionPerServing.fiber * factor)
          : undefined,
      },
    };
  }
}
