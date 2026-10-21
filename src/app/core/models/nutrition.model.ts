export type Gender = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';

export type DietGoal = 'fat_loss' | 'maintenance' | 'muscle_gain';

export type DietType = 'balanced' | 'high_protein' | 'low_carb';

export interface UserProfile {
  gender: Gender;
  age: number;
  height: number; // in cm
  weight: number; // in kg
  activityLevel: ActivityLevel;
  goal: DietGoal;
  dietType: DietType;
  mealsPerDay: number; // 2 to 6
}

export interface MacroDistribution {
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fats: number;    // in grams
  fiber: number;   // in grams
  waterMl: number; // in ml
  proteinCalories: number;
  carbsCalories: number;
  fatsCalories: number;
  proteinPercent: number;
  carbsPercent: number;
  fatsPercent: number;
}

export interface MealSlot {
  id: string;
  name: string;
  icon: string;
  timeSuggestion: string;
  ratio: number; // fraction of total daily intake, e.g. 0.30
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface NutritionPlan {
  userProfile: UserProfile;
  bmi: number;
  bmiCategory: string;
  bmr: number;               // Basal Metabolic Rate (Metabolisme de Base)
  tdee: number;              // Total Daily Energy Expenditure (Dépense Energétique Journalière)
  targetCalories: number;    // Objectif calorique ajusté selon le but
  calorieDelta: number;      // Déficit (-) ou Surplus (+)
  macros: MacroDistribution;
  meals: MealSlot[];
  recommendations: string[];
}

export interface SavedUserData {
  version: string;
  savedAt: string;
  userProfile: UserProfile;
}

export * from './planner.model';
