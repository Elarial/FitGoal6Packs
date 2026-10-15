import { TestBed } from '@angular/core/testing';
import { RecipeService } from './recipe.service';

describe('RecipeService', () => {
  let service: RecipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecipeService);
    service.setCategory('all');
    service.setSearchQuery('');
  });

  it('should be initialized with demo recipes', () => {
    expect(service).toBeTruthy();
    expect(service.recipes().length).toBeGreaterThan(5);
  });

  it('should filter recipes by category', () => {
    service.setCategory('breakfast');
    const filtered = service.filteredRecipes();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r) => r.mealCategories.includes('breakfast'))).toBe(true);
  });

  it('should filter recipes by keyword search', () => {
    service.setSearchQuery('saumon');
    const filtered = service.filteredRecipes();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0].title.toLowerCase()).toContain('saumon');
  });

  it('should scale ingredients and nutrition proportionally to a calorie target', () => {
    const baseRecipe = service.recipes()[0]; // ~485 kcal
    const targetCalories = 600;

    const scaled = service.scaleRecipeToTarget(baseRecipe, targetCalories);
    expect(scaled.scaledNutrition.calories).toBe(600);
    expect(scaled.scaleFactor).toBeGreaterThan(1);

    // Verify ingredients weights have been scaled
    const baseOats = baseRecipe.ingredients.find((i) => i.name.includes('avoine'));
    const scaledOats = scaled.scaledIngredients.find((i) => i.name.includes('avoine'));
    expect(scaledOats!.weightGrams).toBeGreaterThan(baseOats!.weightGrams);
  });
});
