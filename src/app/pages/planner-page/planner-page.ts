import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlannerService } from '../../core/services/planner.service';
import { NutritionService } from '../../core/services/nutrition.service';
import { RecipeService } from '../../core/services/recipe.service';
import { Recipe, ScaledRecipe } from '../../core/models/recipe.model';
import {
  DayOfWeek,
  DAYS_OF_WEEK,
  DayPlan,
  PlannedMealSlot,
} from '../../core/models/planner.model';

@Component({
  selector: 'app-planner-page',
  imports: [FormsModule],
  templateUrl: './planner-page.html',
  styleUrl: './planner-page.scss',
})
export class PlannerPageComponent {
  protected readonly plannerService = inject(PlannerService);
  protected readonly nutritionService = inject(NutritionService);
  protected readonly recipeService = inject(RecipeService);

  // Données globales
  protected readonly userPlan = this.nutritionService.plan;
  protected readonly daysPlan = this.plannerService.daysPlan;
  protected readonly groceryGroups = this.plannerService.groceryGroups;
  protected readonly totalGroceryCount = this.plannerService.totalGroceryCount;
  protected readonly checkedGroceryCount = this.plannerService.checkedGroceryCount;
  protected readonly plannedMealsCount = this.plannerService.plannedMealsCount;
  protected readonly totalSlotsCount = this.plannerService.totalSlotsCount;
  protected readonly formattedGroceryText = this.plannerService.formattedGroceryText;
  protected readonly daysOfWeek = DAYS_OF_WEEK;

  // Onglet principal actif
  protected readonly activeTab = signal<'planner' | 'groceries'>('planner');

  // Filtre par jour pour vue mobile ou focus
  protected readonly selectedDayFilter = signal<DayOfWeek | 'all'>('all');

  // État de la modale de sélection de recette pour un créneau
  protected readonly pickerModalState = signal<{
    day: DayOfWeek;
    dayLabel: string;
    slotId: string;
    slotName: string;
    targetCalories: number;
  } | null>(null);

  protected readonly pickerSearchQuery = signal<string>('');
  protected readonly pickerTabFilter = signal<'suggested' | 'all'>('suggested');

  // État de la modale de consultation de recette
  protected readonly recipeModalState = signal<{
    recipe: Recipe;
    targetCalories: number;
  } | null>(null);

  // Notification toast de copie
  protected readonly copySuccess = signal<boolean>(false);
  private copyTimeout: any = null;

  /**
   * Recettes affichées dans la modale de sélection de créneau
   */
  protected readonly pickerRecipes = computed<Recipe[]>(() => {
    const modal = this.pickerModalState();
    if (!modal) return [];

    const all = this.recipeService.recipes();
    const query = this.pickerSearchQuery().trim().toLowerCase();
    const tab = this.pickerTabFilter();
    const slotLower = modal.slotName.toLowerCase();

    return all.filter((r) => {
      // Filtre de recherche
      const matchQuery =
        !query ||
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.tags.some((t) => t.toLowerCase().includes(query)) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(query));

      if (!matchQuery) return false;

      // Filtre de suggestions selon le type de repas
      if (tab === 'suggested') {
        if (slotLower.includes('petit')) {
          return r.mealCategories.includes('breakfast');
        } else if (slotLower.includes('collation') || slotLower.includes('goûter')) {
          return r.mealCategories.includes('snack');
        } else if (slotLower.includes('dîner') || slotLower.includes('diner')) {
          return r.mealCategories.includes('dinner');
        } else {
          return r.mealCategories.includes('lunch') || r.mealCategories.includes('dinner');
        }
      }

      return true;
    });
  });

  /**
   * Pourcentage de repas planifiés sur la semaine
   */
  protected readonly plannedPercentage = computed<number>(() => {
    const total = this.totalSlotsCount();
    if (total === 0) return 0;
    return Math.round((this.plannedMealsCount() / total) * 100);
  });

  /**
   * Pourcentage d'articles cochés dans la liste de courses
   */
  protected readonly checkedPercentage = computed<number>(() => {
    const total = this.totalGroceryCount();
    if (total === 0) return 0;
    return Math.round((this.checkedGroceryCount() / total) * 100);
  });

  calcDayProgress(day: DayPlan): number {
    if (!day.targetDayCalories || day.targetDayCalories <= 0) return 0;
    return Math.min(100, Math.round((day.totalCalories / day.targetDayCalories) * 100));
  }

  setActiveTab(tab: 'planner' | 'groceries'): void {
    this.activeTab.set(tab);
  }

  setDayFilter(day: DayOfWeek | 'all'): void {
    this.selectedDayFilter.set(day);
  }

  openPicker(dayKey: DayOfWeek, dayLabel: string, slot: PlannedMealSlot): void {
    this.pickerModalState.set({
      day: dayKey,
      dayLabel,
      slotId: slot.slotId,
      slotName: slot.slotName,
      targetCalories: slot.targetCalories,
    });
    this.pickerSearchQuery.set('');
    this.pickerTabFilter.set('suggested');
  }

  closePicker(): void {
    this.pickerModalState.set(null);
  }

  selectRecipeForSlot(recipeId: string): void {
    const modal = this.pickerModalState();
    if (modal) {
      this.plannerService.assignRecipe(modal.day, modal.slotId, recipeId);
      this.closePicker();
    }
  }

  removeRecipeFromSlot(day: DayOfWeek, slotId: string): void {
    this.plannerService.removeRecipe(day, slotId);
  }

  openRecipeDetail(recipe: Recipe, targetCalories: number): void {
    this.recipeModalState.set({ recipe, targetCalories });
  }

  closeRecipeDetail(): void {
    this.recipeModalState.set(null);
  }

  getScaledRecipe(recipe: Recipe, targetCalories: number): ScaledRecipe {
    return this.recipeService.scaleRecipeToTarget(recipe, targetCalories);
  }

  autoGeneratePlan(): void {
    this.plannerService.autoGenerateWeeklyPlan(false);
  }

  clearPlan(): void {
    if (confirm('Voulez-vous vraiment effacer tous les repas planifiés de la semaine ?')) {
      this.plannerService.clearWeeklyPlan();
    }
  }

  toggleItemChecked(itemId: string): void {
    this.plannerService.toggleGroceryItemChecked(itemId);
  }

  checkAllGrocery(): void {
    this.plannerService.checkAllGroceryItems();
  }

  clearAllCheckedGrocery(): void {
    this.plannerService.clearAllChecked();
  }

  async copyGroceryListToClipboard(): Promise<void> {
    const text = this.formattedGroceryText();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      this.copySuccess.set(true);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => {
        this.copySuccess.set(false);
      }, 3500);
    } catch {
      alert('Impossible de copier dans le presse-papier. Utilisez la sélection manuelle.');
    }
  }
}
