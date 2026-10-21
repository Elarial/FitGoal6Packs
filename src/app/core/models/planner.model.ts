import { Recipe, IngredientCategory } from './recipe.model';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DayInfo {
  key: DayOfWeek;
  label: string;
  shortLabel: string;
}

export const DAYS_OF_WEEK: DayInfo[] = [
  { key: 'monday', label: 'Lundi', shortLabel: 'Lun' },
  { key: 'tuesday', label: 'Mardi', shortLabel: 'Mar' },
  { key: 'wednesday', label: 'Mercredi', shortLabel: 'Mer' },
  { key: 'thursday', label: 'Jeudi', shortLabel: 'Jeu' },
  { key: 'friday', label: 'Vendredi', shortLabel: 'Ven' },
  { key: 'saturday', label: 'Samedi', shortLabel: 'Sam' },
  { key: 'sunday', label: 'Dimanche', shortLabel: 'Dim' },
];

export interface PlannedMealSlot {
  slotId: string;
  slotName: string;
  icon: string;
  timeSuggestion: string;
  targetCalories: number;
  recipeId?: string;
  recipe?: Recipe;
  scaledCalories?: number;
  scaledProtein?: number;
  scaledCarbs?: number;
  scaledFats?: number;
}

export interface DayPlan {
  day: DayOfWeek;
  label: string;
  shortLabel: string;
  slots: PlannedMealSlot[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  targetDayCalories: number;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: IngredientCategory;
  isPieceUnit: boolean;
  pieceCount?: number;
  pieceLabel?: string;
  totalWeightGrams: number;
  unit: string;
  dryWeightGrams?: number;
  cookedWeightGrams?: number;
  checked: boolean;
  recipesUsedIn: string[];
}

export interface GroceryCategoryGroup {
  category: IngredientCategory;
  title: string;
  icon: string;
  items: GroceryItem[];
}

export interface PieceStandard {
  standardGrams: number;
  labelSingular: string;
  labelPlural: string;
}

export const PIECE_PROJECTIONS: { pattern: RegExp; standard: PieceStandard }[] = [
  {
    // Banane (std: 110g)
    pattern: /(?:^|\s)banane/iu,
    standard: { standardGrams: 110, labelSingular: 'banane', labelPlural: 'bananes' },
  },
  {
    // Avocat (std chair: 120g)
    pattern: /(?:^|\s)avocat/iu,
    standard: { standardGrams: 120, labelSingular: 'avocat', labelPlural: 'avocats' },
  },
  {
    // Œufs entiers (std calibre moyen: 55g)
    pattern: /(?:^|\s)(?:oeufs?|œufs?)(?!\s*d['’])/iu,
    standard: { standardGrams: 55, labelSingular: 'œuf', labelPlural: 'œufs' },
  },
  {
    // Concombre (std: 300g)
    pattern: /(?:^|\s)concombre/iu,
    standard: { standardGrams: 300, labelSingular: 'concombre', labelPlural: 'concombres' },
  },
  {
    // Courgette (std: 200g)
    pattern: /(?:^|\s)courgette/iu,
    standard: { standardGrams: 200, labelSingular: 'courgette', labelPlural: 'courgettes' },
  },
  {
    // Poivron (std: 160g)
    pattern: /(?:^|\s)poivron/iu,
    standard: { standardGrams: 160, labelSingular: 'poivron', labelPlural: 'poivrons' },
  },
  {
    // Oignon (std: 100g)
    pattern: /(?:^|\s)oignon/iu,
    standard: { standardGrams: 100, labelSingular: 'oignon', labelPlural: 'oignons' },
  },
  {
    // Échalote (std: 25g)
    pattern: /(?:^|\s)(?:échalote|echalote)/iu,
    standard: { standardGrams: 25, labelSingular: 'échalote', labelPlural: 'échalotes' },
  },
  {
    // Citron (std: 100g)
    pattern: /(?:^|\s)citron(?!\s*(?:pressé|en\s*jus))/iu,
    standard: { standardGrams: 100, labelSingular: 'citron', labelPlural: 'citrons' },
  },
  {
    // Pomme (std: 150g)
    pattern: /(?:^|\s)pomme(?!\s*de\s*terre)/iu,
    standard: { standardGrams: 150, labelSingular: 'pomme', labelPlural: 'pommes' },
  },
];
