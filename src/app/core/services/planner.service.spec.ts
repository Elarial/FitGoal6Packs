import { TestBed } from '@angular/core/testing';
import { PlannerService } from './planner.service';
import { NutritionService } from './nutrition.service';
import { RecipeService } from './recipe.service';

describe('PlannerService', () => {
  let service: PlannerService;
  let nutritionService: NutritionService;
  let recipeService: RecipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    nutritionService = TestBed.inject(NutritionService);
    recipeService = TestBed.inject(RecipeService);
    service = TestBed.inject(PlannerService);

    nutritionService.resetToDefaults();
    service.clearWeeklyPlan();
  });

  it('should be created with 7 days', () => {
    expect(service).toBeTruthy();
    const days = service.daysPlan();
    expect(days.length).toBe(7);
    expect(days[0].day).toBe('monday');
    expect(days[6].day).toBe('sunday');
  });

  it('should assign a recipe to a day and slot and scale nutrition', () => {
    const mondaySlotId = 'meal-1';
    const recipeId = 'rec-p1'; // Porridge
    service.assignRecipe('monday', mondaySlotId, recipeId);

    const monday = service.daysPlan().find((d) => d.day === 'monday')!;
    const slot = monday.slots.find((s) => s.slotId === mondaySlotId)!;

    expect(slot.recipe).toBeTruthy();
    expect(slot.recipe?.id).toBe(recipeId);
    expect(slot.scaledCalories).toBeGreaterThan(0);
    expect(monday.totalCalories).toBe(slot.scaledCalories!);
    expect(service.plannedMealsCount()).toBe(1);
  });

  it('should automatically project piece items (bananas, avocados, eggs) to units instead of raw weight', () => {
    // rec-p3: Pancakes Banane (100g banane mûre, 1 oeuf)
    // rec-s1: Shake Banane (110g banane mûre)
    // rec-l1: Buddha Bowl (60g avocat)
    service.assignRecipe('monday', 'meal-1', 'rec-p3');
    service.assignRecipe('monday', 'meal-3', 'rec-s1');
    service.assignRecipe('tuesday', 'meal-2', 'rec-l1');

    const groups = service.groceryGroups();
    const vegFruitGroup = groups.find((g) => g.category === 'vegetable')!;
    expect(vegFruitGroup).toBeTruthy();

    // Check Banana projection
    const bananaItem = vegFruitGroup.items.find((i) => i.name.toLowerCase().includes('banane'));
    expect(bananaItem).toBeTruthy();
    expect(bananaItem?.isPieceUnit).toBe(true);
    expect(bananaItem?.pieceCount).toBeGreaterThanOrEqual(2); // ~210g / 110g = 2 bananas
    expect(bananaItem?.pieceLabel).toContain('banane');

    // Check Avocado projection
    const avocadoItem = vegFruitGroup.items.find((i) => i.name.toLowerCase().includes('avocat'));
    expect(avocadoItem).toBeTruthy();
    expect(avocadoItem?.isPieceUnit).toBe(true);
    expect(avocadoItem?.pieceCount).toBe(1); // 60g -> 1 avocado
    expect(avocadoItem?.pieceLabel).toBe('avocat');
  });

  it('should auto generate a full balanced week of meals', () => {
    service.autoGenerateWeeklyPlan();
    expect(service.plannedMealsCount()).toBe(service.totalSlotsCount());

    const groups = service.groceryGroups();
    expect(groups.length).toBeGreaterThan(0);
    expect(service.totalGroceryCount()).toBeGreaterThan(5);

    const text = service.formattedGroceryText();
    expect(text).toContain('LISTE DE COURSES FITGOAL6PACKS');
    expect(text).toContain('Fruits & Légumes');
  });

  it('should toggle and clear checked items in the grocery list', () => {
    service.assignRecipe('monday', 'meal-1', 'rec-p1');
    const groups = service.groceryGroups();
    const firstItemId = groups[0].items[0].id;

    expect(groups[0].items[0].checked).toBe(false);
    service.toggleGroceryItemChecked(firstItemId);

    const updatedGroups = service.groceryGroups();
    const updatedItem = updatedGroups[0].items.find((i) => i.id === firstItemId);
    expect(updatedItem?.checked).toBe(true);

    service.clearAllChecked();
    expect(service.checkedGroceryCount()).toBe(0);
  });
});
