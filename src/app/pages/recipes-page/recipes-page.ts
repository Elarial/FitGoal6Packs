import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RecipeService } from '../../core/services/recipe.service';
import { NutritionService } from '../../core/services/nutrition.service';
import { Recipe, MealCategory, ScaledRecipe } from '../../core/models/recipe.model';
import { MealSlot } from '../../core/models/nutrition.model';

@Component({
  selector: 'app-recipes-page',
  imports: [FormsModule],
  templateUrl: './recipes-page.html',
  styleUrl: './recipes-page.scss',
})
export class RecipesPageComponent {
  protected readonly recipeService = inject(RecipeService);
  protected readonly nutritionService = inject(NutritionService);

  // Données de l'utilisateur saisies à la page 1
  protected readonly plan = this.nutritionService.plan;
  protected readonly userProfile = this.nutritionService.profile;

  // Filtres actifs
  protected readonly selectedCategory = this.recipeService.selectedCategory;
  protected readonly searchQuery = this.recipeService.searchQuery;
  protected readonly activeTagFilter = signal<string>('all');

  // Repas sélectionné pour la mise à l'échelle automatique
  protected readonly selectedMealSlot = signal<MealSlot | null>(null);

  // Recette sélectionnée pour affichage dans la modale
  protected readonly activeModalRecipe = signal<Recipe | null>(null);

  // Recettes filtrées avec prise en compte du filtre de tag additionnel
  protected readonly displayedRecipes = computed<Recipe[]>(() => {
    const baseList = this.recipeService.filteredRecipes();
    const tag = this.activeTagFilter();
    if (tag === 'all') return baseList;
    return baseList.filter((r) => r.tags.includes(tag));
  });

  // Liste des tags disponibles
  protected readonly availableTags: { tag: string; label: string }[] = [
    { tag: 'all', label: 'Toutes' },
    { tag: 'high_protein', label: '🥩 High Protein' },
    { tag: 'balanced', label: '🥗 Équilibrées' },
    { tag: 'low_carb', label: '🥑 Low Carb' },
    { tag: 'express', label: '⚡ Rapides (<15 min)' },
    { tag: 'vegetarian', label: '🌱 Végétariennes' },
  ];

  selectCategory(category: MealCategory | 'all'): void {
    this.recipeService.setCategory(category);
  }

  setTagFilter(tag: string): void {
    this.activeTagFilter.set(tag);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.recipeService.setSearchQuery(value);
  }

  selectMealSlot(slot: MealSlot | null): void {
    this.selectedMealSlot.set(slot);
    if (slot) {
      // Filtrer intelligemment les recettes selon le nom du créneau
      const lower = slot.name.toLowerCase();
      if (lower.includes('petit')) {
        this.recipeService.setCategory('breakfast');
      } else if (lower.includes('déjeuner') || lower.includes('dejeuner')) {
        this.recipeService.setCategory('lunch');
      } else if (lower.includes('collation') || lower.includes('goûter')) {
        this.recipeService.setCategory('snack');
      } else if (lower.includes('dîner') || lower.includes('diner')) {
        this.recipeService.setCategory('dinner');
      }
    } else {
      this.recipeService.setCategory('all');
    }
  }

  openRecipeModal(recipe: Recipe): void {
    this.activeModalRecipe.set(recipe);
  }

  closeRecipeModal(): void {
    this.activeModalRecipe.set(null);
  }

  /**
   * Retourne la recette ajustée aux calories du créneau sélectionné
   * ou la recette originale si aucun créneau n'est ciblé.
   */
  getScaledRecipe(recipe: Recipe): ScaledRecipe {
    const slot = this.selectedMealSlot();
    const targetCalories = slot ? slot.calories : recipe.nutritionPerServing.calories;
    return this.recipeService.scaleRecipeToTarget(recipe, targetCalories);
  }
}
