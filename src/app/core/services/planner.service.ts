import { Injectable, inject, signal, computed } from '@angular/core';
import { NutritionService } from './nutrition.service';
import { RecipeService } from './recipe.service';
import { Recipe, IngredientCategory } from '../models/recipe.model';
import {
  DayOfWeek,
  DAYS_OF_WEEK,
  DayPlan,
  PlannedMealSlot,
  GroceryItem,
  GroceryCategoryGroup,
  PIECE_PROJECTIONS,
} from '../models/planner.model';

const STORAGE_KEY_PLAN = 'fitgoal_weekly_planner_v1';
const STORAGE_KEY_CHECKED = 'fitgoal_grocery_checked_v1';

type WeeklyPlanState = Record<DayOfWeek, Record<string, string | null>>;

@Injectable({
  providedIn: 'root',
})
export class PlannerService {
  private readonly nutritionService = inject(NutritionService);
  private readonly recipeService = inject(RecipeService);

  readonly weeklyState = signal<WeeklyPlanState>(this.loadPlanFromStorage());
  readonly checkedGroceryIds = signal<string[]>(this.loadCheckedFromStorage());

  /**
   * Plans complets pour les 7 jours de la semaine
   */
  readonly daysPlan = computed<DayPlan[]>(() => {
    const userPlan = this.nutritionService.plan();
    const state = this.weeklyState();
    const allRecipes = this.recipeService.recipes();

    return DAYS_OF_WEEK.map((dayInfo) => {
      const dayKey = dayInfo.key;
      const dayAssignments = state[dayKey] ?? {};

      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;

      const slots: PlannedMealSlot[] = userPlan.meals.map((mealSlot) => {
        const recipeId = dayAssignments[mealSlot.id] ?? undefined;
        let recipe: Recipe | undefined;
        let scaledCalories: number | undefined;
        let scaledProtein: number | undefined;
        let scaledCarbs: number | undefined;
        let scaledFats: number | undefined;

        if (recipeId) {
          const rawRecipe = allRecipes.find((r) => r.id === recipeId);
          if (rawRecipe) {
            recipe = rawRecipe;
            const scaled = this.recipeService.scaleRecipeToTarget(rawRecipe, mealSlot.calories);
            scaledCalories = scaled.scaledNutrition.calories;
            scaledProtein = scaled.scaledNutrition.protein;
            scaledCarbs = scaled.scaledNutrition.carbs;
            scaledFats = scaled.scaledNutrition.fats;

            totalCalories += scaledCalories;
            totalProtein += scaledProtein;
            totalCarbs += scaledCarbs;
            totalFats += scaledFats;
          }
        }

        return {
          slotId: mealSlot.id,
          slotName: mealSlot.name,
          icon: mealSlot.icon,
          timeSuggestion: mealSlot.timeSuggestion,
          targetCalories: mealSlot.calories,
          recipeId,
          recipe,
          scaledCalories,
          scaledProtein,
          scaledCarbs,
          scaledFats,
        };
      });

      return {
        day: dayKey,
        label: dayInfo.label,
        shortLabel: dayInfo.shortLabel,
        slots,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFats,
        targetDayCalories: userPlan.targetCalories,
      };
    });
  });

  /**
   * Nombre total de créneaux configurés sur la semaine
   */
  readonly totalSlotsCount = computed<number>(() => {
    const mealCount = this.nutritionService.plan().meals.length || 4;
    return mealCount * 7;
  });

  /**
   * Nombre de repas planifiés
   */
  readonly plannedMealsCount = computed<number>(() => {
    let count = 0;
    for (const day of this.daysPlan()) {
      for (const slot of day.slots) {
        if (slot.recipe) count++;
      }
    }
    return count;
  });

  /**
   * Liste de courses consolidée et catégorisée
   */
  readonly groceryGroups = computed<GroceryCategoryGroup[]>(() => {
    const days = this.daysPlan();
    const checkedSet = new Set(this.checkedGroceryIds());
    const aggregationMap = new Map<
      string,
      {
        id: string;
        name: string;
        category: IngredientCategory;
        totalWeightGrams: number;
        unit: string;
        dryWeightGrams?: number;
        cookedWeightGrams?: number;
        recipesUsedIn: Set<string>;
      }
    >();

    for (const day of days) {
      for (const slot of day.slots) {
        if (!slot.recipe) continue;

        // Mise à l'échelle proportionnelle aux calories du créneau
        const scaled = this.recipeService.scaleRecipeToTarget(slot.recipe, slot.targetCalories);

        for (const ing of scaled.scaledIngredients) {
          const canonical = this.getCanonicalName(ing.name);
          const key = `${canonical.toLowerCase()}__${ing.category}`;

          const existing = aggregationMap.get(key);
          if (existing) {
            existing.totalWeightGrams += ing.weightGrams;
            if (ing.dryWeightGrams != null) {
              existing.dryWeightGrams = (existing.dryWeightGrams ?? 0) + ing.dryWeightGrams;
            }
            if (ing.cookedWeightGrams != null) {
              existing.cookedWeightGrams = (existing.cookedWeightGrams ?? 0) + ing.cookedWeightGrams;
            }
            existing.recipesUsedIn.add(slot.recipe.title);
          } else {
            aggregationMap.set(key, {
              id: key,
              name: canonical,
              category: ing.category,
              totalWeightGrams: ing.weightGrams,
              unit: ing.unit ?? 'g',
              dryWeightGrams: ing.dryWeightGrams,
              cookedWeightGrams: ing.cookedWeightGrams,
              recipesUsedIn: new Set([slot.recipe.title]),
            });
          }
        }
      }
    }

    // Traitement des projections à la pièce et tri
    const allItems: GroceryItem[] = [];
    for (const val of aggregationMap.values()) {
      const projection = this.computePieceProjection(val.name, val.totalWeightGrams, val.unit, val.category);

      allItems.push({
        id: val.id,
        name: val.name,
        category: val.category,
        isPieceUnit: projection.isPieceUnit,
        pieceCount: projection.pieceCount,
        pieceLabel: projection.pieceLabel,
        totalWeightGrams: Math.round(val.totalWeightGrams),
        unit: val.unit,
        dryWeightGrams: val.dryWeightGrams != null ? Math.round(val.dryWeightGrams) : undefined,
        cookedWeightGrams: val.cookedWeightGrams != null ? Math.round(val.cookedWeightGrams) : undefined,
        checked: checkedSet.has(val.id),
        recipesUsedIn: Array.from(val.recipesUsedIn),
      });
    }

    // Définition des rayons d'achats avec rattachement logique (ex: avocat dans Fruits & Légumes)
    const categoryConfig: {
      category: IngredientCategory;
      title: string;
      icon: string;
      matcher: (item: GroceryItem) => boolean;
    }[] = [
      {
        category: 'vegetable',
        title: 'Fruits & Légumes Frais',
        icon: '🥦',
        matcher: (item) =>
          item.category === 'vegetable' ||
          item.category === 'fruit' ||
          item.name.toLowerCase().includes('avocat'),
      },
      {
        category: 'protein',
        title: 'Boucherie, Poissonnerie & Protéines',
        icon: '🥩',
        matcher: (item) => item.category === 'protein',
      },
      {
        category: 'dairy',
        title: 'Produits Frais & Laitiers',
        icon: '🥛',
        matcher: (item) => item.category === 'dairy',
      },
      {
        category: 'carb',
        title: 'Épicerie, Céréales & Féculents',
        icon: '🌾',
        matcher: (item) => item.category === 'carb',
      },
      {
        category: 'fat',
        title: 'Oléagineux & Matières Grasses',
        icon: '🥑',
        matcher: (item) => item.category === 'fat' && !item.name.toLowerCase().includes('avocat'),
      },
      {
        category: 'seasoning',
        title: 'Condiments, Épices & Herbes',
        icon: '🧂',
        matcher: (item) => item.category === 'seasoning',
      },
    ];

    const groups: GroceryCategoryGroup[] = [];

    for (const cfg of categoryConfig) {
      const itemsInGroup = allItems.filter((i) => cfg.matcher(i));
      if (itemsInGroup.length > 0) {
        itemsInGroup.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        groups.push({
          category: cfg.category,
          title: cfg.title,
          icon: cfg.icon,
          items: itemsInGroup,
        });
      }
    }

    return groups;
  });

  /**
   * Nombre total d'articles dans la liste de courses
   */
  readonly totalGroceryCount = computed<number>(() => {
    return this.groceryGroups().reduce((acc, g) => acc + g.items.length, 0);
  });

  /**
   * Nombre d'articles cochés
   */
  readonly checkedGroceryCount = computed<number>(() => {
    return this.groceryGroups().reduce(
      (acc, g) => acc + g.items.filter((i) => i.checked).length,
      0
    );
  });

  /**
   * Texte formaté pour copie presse-papier rapide
   */
  readonly formattedGroceryText = computed<string>(() => {
    const groups = this.groceryGroups();
    const totalCount = this.totalGroceryCount();

    if (groups.length === 0) {
      return 'Aucun repas planifié pour le moment dans FitGoal6Packs.';
    }

    const lines: string[] = [];
    lines.push('🛒 LISTE DE COURSES FITGOAL6PACKS');
    lines.push(`Semaine du Lundi au Dimanche • ${totalCount} articles au total\n`);

    for (const group of groups) {
      lines.push(`${group.icon} ${group.title}`);
      for (const item of group.items) {
        let quantityStr = '';
        if (item.isPieceUnit && item.pieceCount) {
          quantityStr = `${item.pieceCount} ${item.pieceLabel} (~${item.totalWeightGrams}g)`;
        } else if (item.dryWeightGrams != null && item.cookedWeightGrams != null) {
          quantityStr = `${item.dryWeightGrams}g sec (~${item.cookedWeightGrams}g cuit)`;
        } else {
          quantityStr = `${item.totalWeightGrams} ${item.unit}`;
        }

        const checkMark = item.checked ? '[x]' : '[ ]';
        lines.push(`  ${checkMark} ${item.name} : ${quantityStr}`);
      }
      lines.push(''); // Ligne vide de séparation
    }

    lines.push('Généré automatiquement par FitGoal6Packs Nutrition.');
    return lines.join('\n');
  });

  /**
   * Assigne une recette à un créneau d'un jour donné
   */
  assignRecipe(day: DayOfWeek, slotId: string, recipeId: string): void {
    this.weeklyState.update((current) => {
      const updated = { ...current };
      const daySlots = { ...(updated[day] ?? {}) };
      daySlots[slotId] = recipeId;
      updated[day] = daySlots;
      this.savePlanToStorage(updated);
      return updated;
    });
  }

  /**
   * Supprime une recette d'un créneau
   */
  removeRecipe(day: DayOfWeek, slotId: string): void {
    this.weeklyState.update((current) => {
      const updated = { ...current };
      if (!updated[day]) return current;

      const daySlots = { ...updated[day] };
      delete daySlots[slotId];
      updated[day] = daySlots;
      this.savePlanToStorage(updated);
      return updated;
    });
  }

  /**
   * Vide tout le planning hebdomadaire
   */
  clearWeeklyPlan(): void {
    const emptyState: WeeklyPlanState = {
      monday: {},
      tuesday: {},
      wednesday: {},
      thursday: {},
      friday: {},
      saturday: {},
      sunday: {},
    };
    this.weeklyState.set(emptyState);
    this.savePlanToStorage(emptyState);
  }

  /**
   * Génère automatiquement un planning équilibré sur toute la semaine
   */
  autoGenerateWeeklyPlan(onlyEmptySlots = false): void {
    const allRecipes = this.recipeService.recipes();
    const userPlan = this.nutritionService.plan();

    const breakfastRecipes = allRecipes.filter((r) => r.mealCategories.includes('breakfast'));
    const lunchRecipes = allRecipes.filter((r) => r.mealCategories.includes('lunch'));
    const snackRecipes = allRecipes.filter((r) => r.mealCategories.includes('snack'));
    const dinnerRecipes = allRecipes.filter((r) => r.mealCategories.includes('dinner'));

    this.weeklyState.update((current) => {
      const updated: WeeklyPlanState = {
        monday: { ...(current.monday ?? {}) },
        tuesday: { ...(current.tuesday ?? {}) },
        wednesday: { ...(current.wednesday ?? {}) },
        thursday: { ...(current.thursday ?? {}) },
        friday: { ...(current.friday ?? {}) },
        saturday: { ...(current.saturday ?? {}) },
        sunday: { ...(current.sunday ?? {}) },
      };

      DAYS_OF_WEEK.forEach((dayInfo, dayIdx) => {
        const dayKey = dayInfo.key;
        userPlan.meals.forEach((slot, slotIdx) => {
          if (onlyEmptySlots && updated[dayKey][slot.id]) {
            return;
          }

          const lower = slot.name.toLowerCase();
          let pool = allRecipes;

          if (lower.includes('petit')) {
            pool = breakfastRecipes.length ? breakfastRecipes : allRecipes;
          } else if (lower.includes('dîner') || lower.includes('diner')) {
            pool = dinnerRecipes.length ? dinnerRecipes : allRecipes;
          } else if (lower.includes('collation') || lower.includes('goûter')) {
            pool = snackRecipes.length ? snackRecipes : allRecipes;
          } else {
            pool = lunchRecipes.length ? lunchRecipes : allRecipes;
          }

          // Rotation équilibrée selon le jour et l'index de repas
          const pickIndex = (dayIdx + slotIdx) % pool.length;
          updated[dayKey][slot.id] = pool[pickIndex].id;
        });
      });

      this.savePlanToStorage(updated);
      return updated;
    });
  }

  /**
   * Coche ou décoche un article de la liste de courses
   */
  toggleGroceryItemChecked(itemId: string): void {
    this.checkedGroceryIds.update((current) => {
      const exists = current.includes(itemId);
      const updated = exists ? current.filter((id) => id !== itemId) : [...current, itemId];
      this.saveCheckedToStorage(updated);
      return updated;
    });
  }

  /**
   * Coche tous les articles
   */
  checkAllGroceryItems(): void {
    const allIds: string[] = [];
    for (const group of this.groceryGroups()) {
      for (const item of group.items) {
        allIds.push(item.id);
      }
    }
    this.checkedGroceryIds.set(allIds);
    this.saveCheckedToStorage(allIds);
  }

  /**
   * Décoche tous les articles
   */
  clearAllChecked(): void {
    this.checkedGroceryIds.set([]);
    this.saveCheckedToStorage([]);
  }

  /**
   * Projection d'un aliment acheté à la pièce (bananes, avocats, œufs, etc.)
   */
  private computePieceProjection(
    name: string,
    totalWeightGrams: number,
    unit: string,
    category: IngredientCategory
  ): { isPieceUnit: boolean; pieceCount?: number; pieceLabel?: string } {
    // Si c'est un assaisonnement composé ou un jus, ne pas projeter en fruit entier
    if (category === 'seasoning' || name.toLowerCase().includes('jus de citron') || name.toLowerCase().includes('aneth')) {
      return { isPieceUnit: false };
    }

    for (const item of PIECE_PROJECTIONS) {
      if (item.pattern.test(name)) {
        const std = item.standard;
        const count = Math.max(1, Math.ceil(totalWeightGrams / std.standardGrams));
        const label = count > 1 ? std.labelPlural : std.labelSingular;
        return {
          isPieceUnit: true,
          pieceCount: count,
          pieceLabel: label,
        };
      }
    }

    if (unit && unit.toLowerCase().includes('pièce')) {
      const count = Math.max(1, Math.round(totalWeightGrams / 55));
      return {
        isPieceUnit: true,
        pieceCount: count,
        pieceLabel: count > 1 ? 'pièces' : 'pièce',
      };
    }

    return { isPieceUnit: false };
  }

  /**
   * Harmonise les noms d'ingrédients pour éviter les doublons dans la liste de courses
   */
  private getCanonicalName(rawName: string): string {
    const cleaned = rawName
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const lower = cleaned.toLowerCase();

    if (lower.startsWith('banane')) return 'Bananes';
    if (lower.startsWith('avocat')) return 'Avocats';
    if (lower.includes('oeuf') || lower.includes('œuf')) {
      if (lower.includes('blanc')) return "Blancs d'œufs";
      return 'Œufs entiers plein air';
    }
    if (lower.includes('tomate') && lower.includes('cerise')) return 'Tomates cerises';
    if (lower.includes('tomate')) return 'Tomates & pulpe';
    if (lower.includes('courgette')) return 'Courgettes';
    if (lower.includes('concombre')) return 'Concombres';
    if (lower.includes('poivron')) return 'Poivrons rouges';
    if (lower.includes('oignon')) return 'Oignons rouges';
    if (lower.includes('échalote') || lower.includes('echalote')) return 'Échalotes';
    if (lower.includes('brocoli')) return 'Brocolis frais';
    if (lower.includes('carotte')) return 'Carottes';
    if (lower.includes('butternut')) return 'Courge butternut';
    if (lower.includes('patate douce')) return 'Patates douces';
    if (lower.includes('épinard') || lower.includes('epinard')) return 'Pousses d’épinards';
    if (lower.includes('pois gourmand')) return 'Pois gourmands';
    if (lower.includes('soja')) return 'Pousses de soja';
    if (lower.includes('roquette')) return 'Pousses de roquette';
    if (lower.includes('champignon')) return 'Champignons de Paris';
    if (lower.includes('olive') && !lower.includes('huile')) return 'Olives vertes dénoyautées';

    if (lower.includes('huile d’olive') || lower.includes("huile d'olive")) return "Huile d'olive vierge extra";
    if (lower.includes('huile de colza')) return 'Huile de colza';
    if (lower.includes('huile de sésame') || lower.includes('sauce soja')) return 'Sauce soja & huile de sésame';
    if (lower.includes('lait de coco')) return 'Lait de coco allégé';

    if (lower.includes('flocon') && lower.includes('avoine')) return "Flocons d'avoine complets";
    if (lower.includes('farine d’avoine') || lower.includes("farine d'avoine")) return "Farine d'avoine";
    if (lower.includes('quinoa')) return 'Quinoa';
    if (lower.includes('semoule')) return 'Semoule complète';
    if (lower.includes('boulgour')) return 'Boulgour complet';
    if (lower.includes('soba')) return 'Nouilles soba au sarrasin';
    if (lower.includes('nouille')) return 'Nouilles de riz';
    if (lower.includes('haricot') && lower.includes('noir')) return 'Haricots noirs';
    if (lower.includes('haricot')) return 'Haricots verts extra-fins';
    if (lower.includes('lentille') && lower.includes('corail')) return 'Lentilles corail';
    if (lower.includes('lentille')) return 'Lentilles vertes';
    if (lower.includes('riz') && lower.includes('jasmin')) return 'Riz jasmin';
    if (lower.includes('riz')) return 'Riz basmati';

    if (lower.includes('crevette')) return 'Crevettes roses décortiquées';
    if (lower.includes('saumon')) return 'Pavé de saumon frais';
    if (lower.includes('lieu noir')) return 'Dos de lieu noir frais';
    if (lower.includes('cabillaud')) return 'Dos de cabillaud frais';
    if (lower.includes('poulet')) return 'Filet de poulet fermier';
    if (lower.includes('dinde')) return 'Escalope de dinde';
    if (lower.includes('boeuf') || lower.includes('bœuf') || lower.includes('rumsteck')) return 'Bœuf haché 5% MG';
    if (lower.includes('thon')) return 'Thon blanc au naturel';
    if (lower.includes('tofu')) return 'Tofu ferme';

    if (lower.includes('skyr') || lower.includes('fromage blanc')) return 'Fromage blanc 0% ou Skyr';
    if (lower.includes('feta')) return 'Feta AOP';
    if (lower.includes('chia')) return 'Graines de chia';
    if (lower.includes('lait d’amande') || lower.includes("lait d'amande")) return "Lait d'amande sans sucre";
    if (lower.includes('beurre d’amande') || lower.includes("beurre d'amande")) return "Beurre d'amande 100% pur";
    if (lower.includes('beurre de cacahuète')) return 'Beurre de cacahuète 100% pur';
    if (lower.includes('amande')) return 'Amandes concassées';
    if (lower.includes('myrtille')) return 'Myrtilles fraîches';
    if (lower.includes('protéine en poudre') || lower.includes('poudre de protéine') || lower.includes('whey')) {
      return 'Protéine en poudre (Whey ou végétale)';
    }

    return cleaned;
  }

  private loadPlanFromStorage(): WeeklyPlanState {
    const emptyState: WeeklyPlanState = {
      monday: {},
      tuesday: {},
      wednesday: {},
      thursday: {},
      friday: {},
      saturday: {},
      sunday: {},
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY_PLAN);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...emptyState, ...parsed };
      }
    } catch {
      // Fallback
    }
    return emptyState;
  }

  private savePlanToStorage(state: WeeklyPlanState): void {
    try {
      localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(state));
    } catch {
      // Fallback
    }
  }

  private loadCheckedFromStorage(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHECKED);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  private saveCheckedToStorage(ids: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(ids));
    } catch {
      // Fallback
    }
  }
}
