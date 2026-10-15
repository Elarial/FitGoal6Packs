import { Injectable, signal, computed } from '@angular/core';
import {
  UserProfile,
  NutritionPlan,
  MacroDistribution,
  MealSlot,
  ActivityLevel,
  DietGoal,
  DietType,
} from '../models/nutrition.model';

const STORAGE_KEY = 'fitgoal_user_profile';

const DEFAULT_PROFILE: UserProfile = {
  gender: 'male',
  age: 28,
  height: 178,
  weight: 75,
  activityLevel: 'moderate',
  goal: 'fat_loss',
  dietType: 'balanced',
  mealsPerDay: 4,
};

@Injectable({
  providedIn: 'root',
})
export class NutritionService {
  readonly profile = signal<UserProfile>(this.loadProfileFromStorage());

  readonly plan = computed<NutritionPlan>(() => {
    return this.calculateNutritionPlan(this.profile());
  });

  updateProfile(partial: Partial<UserProfile>): void {
    this.profile.update((current) => {
      const updated: UserProfile = { ...current, ...partial };
      this.saveProfileToStorage(updated);
      return updated;
    });
  }

  resetToDefaults(): void {
    this.profile.set({ ...DEFAULT_PROFILE });
    this.saveProfileToStorage(DEFAULT_PROFILE);
  }

  private loadProfileFromStorage(): UserProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_PROFILE, ...parsed };
      }
    } catch {
      // Fallback silently if localStorage is not accessible
    }
    return { ...DEFAULT_PROFILE };
  }

  private saveProfileToStorage(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  private calculateNutritionPlan(profile: UserProfile): NutritionPlan {
    const { gender, age, height, weight, activityLevel, goal, dietType, mealsPerDay } = profile;

    // 1. Indice de Masse Corporelle (IMC / BMI)
    const heightInMeters = Math.max(height, 50) / 100;
    const safeWeight = Math.max(weight, 30);
    const bmi = Number((safeWeight / (heightInMeters * heightInMeters)).toFixed(1));

    let bmiCategory = 'Corpulence normale';
    if (bmi < 18.5) bmiCategory = 'Insuffisance pondérale';
    else if (bmi < 25) bmiCategory = 'Poids santé';
    else if (bmi < 30) bmiCategory = 'Surpoids';
    else if (bmi < 35) bmiCategory = 'Obésité modérée';
    else bmiCategory = 'Obésité sévère';

    // 2. Métabolisme de Base (BMR / MB) - Équation de Mifflin-St Jeor
    // Homme: (10 x poid) + (6.25 x taille) - (5 x age) + 5
    // Femme: (10 x poid) + (6.25 x taille) - (5 x age) - 161
    let bmr = 10 * safeWeight + 6.25 * height - 5 * age;
    if (gender === 'male') {
      bmr += 5;
    } else {
      bmr -= 161;
    }
    bmr = Math.round(bmr);

    // 3. Dépense Énergétique Journalière (TDEE / DEJ)
    const activityMultipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very_active: 1.725,
      extra_active: 1.9,
    };
    const tdee = Math.round(bmr * (activityMultipliers[activityLevel] ?? 1.55));

    // 4. Objectif Calorique selon le But (Deficit / Surplus sécurisé)
    let calorieDelta = 0;
    if (goal === 'fat_loss') {
      // Déficit de 20% plafonné à 500 kcal pour préserver la masse musculaire
      calorieDelta = -Math.min(500, Math.round(tdee * 0.2));
    } else if (goal === 'muscle_gain') {
      // Léger surplus de 15% (environ 300-400 kcal) pour prise de masse propre
      calorieDelta = Math.min(450, Math.round(tdee * 0.15));
    }

    let targetCalories = tdee + calorieDelta;
    // Seuil de sécurité métabolique minimum
    const minimumCalorieFloor = gender === 'male' ? 1500 : 1200;
    if (targetCalories < minimumCalorieFloor) {
      targetCalories = minimumCalorieFloor;
      calorieDelta = targetCalories - tdee;
    }

    // 5. Répartition des Macronutriments
    // Protéines: calcul basé sur le poids corporel (g/kg) et ajusté selon l'objectif
    let proteinPerKg = 1.8;
    if (goal === 'fat_loss') {
      proteinPerKg = 2.2; // Haute teneur pour satiété et protection musculaire
    } else if (goal === 'muscle_gain') {
      proteinPerKg = 2.0; // Idéal synthèse protéique
    } else {
      proteinPerKg = 1.6; // Maintenance
    }

    if (dietType === 'high_protein') {
      proteinPerKg += 0.3;
    } else if (dietType === 'low_carb') {
      proteinPerKg += 0.2;
    }

    const proteinGrams = Math.round(safeWeight * proteinPerKg);
    const proteinCalories = proteinGrams * 4;

    // Lipides: essentiel pour équilibre hormonal (minimum 0.9g/kg ou 25-30% des calories)
    let fatRatio = 0.28;
    if (dietType === 'low_carb') fatRatio = 0.40;
    if (dietType === 'high_protein') fatRatio = 0.25;

    let fatsCalories = Math.round(targetCalories * fatRatio);
    // Assurer minimum 0.8g/kg de lipides
    const minFatGrams = safeWeight * 0.8;
    if (fatsCalories / 9 < minFatGrams) {
      fatsCalories = Math.round(minFatGrams * 9);
    }
    const fatsGrams = Math.round(fatsCalories / 9);

    // Glucides: reste des calories
    const remainingCalories = Math.max(0, targetCalories - (proteinCalories + fatsCalories));
    const carbsGrams = Math.round(remainingCalories / 4);
    const carbsCalories = carbsGrams * 4;

    // Recalcul des pourcentages réels
    const totalMacroCalories = proteinCalories + carbsCalories + fatsCalories;
    const proteinPercent = Math.round((proteinCalories / totalMacroCalories) * 100);
    const carbsPercent = Math.round((carbsCalories / totalMacroCalories) * 100);
    const fatsPercent = Math.round((fatsCalories / totalMacroCalories) * 100);

    // Fibres recommandées (~14g par 1000 kcal)
    const fiberGrams = Math.round((targetCalories / 1000) * 14);

    // Hydratation recommandée (35ml/kg + compensation activité)
    const activityBonusMl = activityLevel === 'sedentary' ? 0 : activityLevel === 'light' ? 300 : activityLevel === 'moderate' ? 600 : 1000;
    const waterMl = Math.round(safeWeight * 35 + activityBonusMl);

    const macros: MacroDistribution = {
      calories: targetCalories,
      protein: proteinGrams,
      carbs: carbsGrams,
      fats: fatsGrams,
      fiber: fiberGrams,
      waterMl,
      proteinCalories,
      carbsCalories,
      fatsCalories,
      proteinPercent,
      carbsPercent,
      fatsPercent,
    };

    // 6. Répartition par repas selon la fréquence choisie
    const meals = this.generateMealSlots(mealsPerDay, macros);

    // 7. Conseils personnalisés
    const recommendations = this.generateRecommendations(profile, macros, bmi);

    return {
      userProfile: profile,
      bmi,
      bmiCategory,
      bmr,
      tdee,
      targetCalories,
      calorieDelta,
      macros,
      meals,
      recommendations,
    };
  }

  private generateMealSlots(mealsPerDay: number, macros: MacroDistribution): MealSlot[] {
    const templates: Record<number, { name: string; icon: string; time: string; ratio: number }[]> = {
      2: [
        { name: 'Déjeuner', icon: '☀️', time: '12:00 - 13:30', ratio: 0.50 },
        { name: 'Dîner', icon: '🌙', time: '19:30 - 21:00', ratio: 0.50 },
      ],
      3: [
        { name: 'Petit-déjeuner', icon: '🌅', time: '07:30 - 09:00', ratio: 0.25 },
        { name: 'Déjeuner', icon: '☀️', time: '12:30 - 13:30', ratio: 0.40 },
        { name: 'Dîner', icon: '🌙', time: '19:30 - 20:30', ratio: 0.35 },
      ],
      4: [
        { name: 'Petit-déjeuner', icon: '🌅', time: '07:30 - 09:00', ratio: 0.25 },
        { name: 'Déjeuner', icon: '☀️', time: '12:30 - 13:30', ratio: 0.35 },
        { name: 'Collation saine', icon: '🍎', time: '16:30 - 17:30', ratio: 0.15 },
        { name: 'Dîner', icon: '🌙', time: '19:30 - 20:30', ratio: 0.25 },
      ],
      5: [
        { name: 'Petit-déjeuner', icon: '🌅', time: '07:30 - 08:30', ratio: 0.20 },
        { name: 'Collation Matin', icon: '🥑', time: '10:30 - 11:00', ratio: 0.10 },
        { name: 'Déjeuner', icon: '☀️', time: '12:30 - 13:30', ratio: 0.35 },
        { name: 'Collation Après-midi', icon: '🍎', time: '16:30 - 17:30', ratio: 0.15 },
        { name: 'Dîner', icon: '🌙', time: '19:30 - 20:30', ratio: 0.20 },
      ],
      6: [
        { name: 'Petit-déjeuner', icon: '🌅', time: '07:30 - 08:30', ratio: 0.20 },
        { name: 'Collation Matin', icon: '🥑', time: '10:30 - 11:00', ratio: 0.10 },
        { name: 'Déjeuner', icon: '☀️', time: '12:30 - 13:30', ratio: 0.30 },
        { name: 'Collation Pré-Sport', icon: '🍌', time: '16:30 - 17:00', ratio: 0.10 },
        { name: 'Dîner', icon: '🌙', time: '19:30 - 20:30', ratio: 0.20 },
        { name: 'Collation Coucher', icon: '🥛', time: '22:00 - 22:30', ratio: 0.10 },
      ],
    };

    const count = Math.min(Math.max(mealsPerDay, 2), 6);
    const slots = templates[count] ?? templates[4];

    return slots.map((slot, index) => ({
      id: `meal-${index + 1}`,
      name: slot.name,
      icon: slot.icon,
      timeSuggestion: slot.time,
      ratio: slot.ratio,
      calories: Math.round(macros.calories * slot.ratio),
      protein: Math.round(macros.protein * slot.ratio),
      carbs: Math.round(macros.carbs * slot.ratio),
      fats: Math.round(macros.fats * slot.ratio),
    }));
  }

  private generateRecommendations(profile: UserProfile, macros: MacroDistribution, bmi: number): string[] {
    const tips: string[] = [];

    if (profile.goal === 'fat_loss') {
      tips.push('Maintenez un apport protéique régulier à chaque repas pour stimuler la satiété et préserver votre capital musculaire.');
      tips.push('Privilégiez les aliments volumineux et peu denses en calories (légumes verts, céréales complètes, baies).');
    } else if (profile.goal === 'muscle_gain') {
      tips.push('Répartissez vos protéines sur vos ' + profile.mealsPerDay + ' prises pour maximiser la synthèse protéique musculaire (environ 25 à 40g par repas).');
      tips.push('Les glucides autour de vos séances d’entraînement faciliteront les performances et la récupération.');
    } else {
      tips.push('Votre apport est calibré sur votre maintenance énergétique. Idéal pour stabiliser votre poids tout en optimisant votre énergie.');
    }

    tips.push(`Objectif d’hydratation : au moins ${(macros.waterMl / 1000).toFixed(1)} L d'eau par jour pour soutenir votre métabolisme.`);
    tips.push(`Visez un minimum de ${macros.fiber}g de fibres par jour pour une flore intestinale saine et une glycémie stable.`);

    return tips;
  }
}
