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

  it('should contain recipes with Air Fryer cooking method', () => {
    const airFryerRecipes = service.recipes().filter(
      (r) => r.cookingMethod === 'air_fryer' || r.tags.includes('air_fryer')
    );
    expect(airFryerRecipes.length).toBeGreaterThan(3);
  });

  it('should scale ingredients, dry weight and cooked weight proportionally to a calorie target', () => {
    const baseRecipe = service.recipes()[0]; // ~485 kcal, porridge with oats
    const targetCalories = 600;

    const scaled = service.scaleRecipeToTarget(baseRecipe, targetCalories);
    expect(scaled.scaledNutrition.calories).toBe(600);
    expect(scaled.scaleFactor).toBeGreaterThan(1);

    // Verify dry and cooked weights of oats are scaled
    const baseOats = baseRecipe.ingredients.find((i) => i.name.includes('avoine'));
    const scaledOats = scaled.scaledIngredients.find((i) => i.name.includes('avoine'));

    expect(scaledOats).toBeDefined();
    expect(scaledOats!.weightGrams).toBeGreaterThan(baseOats!.weightGrams);
    expect(scaledOats!.dryWeightGrams).toBeDefined();
    expect(scaledOats!.cookedWeightGrams).toBeDefined();
    expect(scaledOats!.dryWeightGrams!).toBeGreaterThan(baseOats!.dryWeightGrams!);
    expect(scaledOats!.cookedWeightGrams!).toBeGreaterThan(baseOats!.cookedWeightGrams!);
  });

  it('should scale pieceCount for ingredients like eggs when calorie target increases', () => {
    // rec-p2 has 3 eggs for 395 kcal
    const frittata = service.recipes().find((r) => r.id === 'rec-p2');
    expect(frittata).toBeDefined();

    const eggBase = frittata!.ingredients.find((i) => i.name.toLowerCase().includes('œufs') || i.name.toLowerCase().includes('oeufs'));
    expect(eggBase).toBeDefined();
    expect(eggBase!.pieceCount).toBe(3);

    // Scale up to 800 kcal (~2x)
    const scaled = service.scaleRecipeToTarget(frittata!, 800);
    const eggScaled = scaled.scaledIngredients.find((i) => i.name.toLowerCase().includes('œufs') || i.name.toLowerCase().includes('oeufs'));
    expect(eggScaled).toBeDefined();
    expect(eggScaled!.pieceCount).toBeGreaterThanOrEqual(5);
    expect(eggScaled!.weightGrams).toBeGreaterThan(eggBase!.weightGrams);
  });
});
