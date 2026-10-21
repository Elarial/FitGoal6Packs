import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NutritionService } from '../../core/services/nutrition.service';
import {
  Gender,
  ActivityLevel,
  DietGoal,
  DietType,
} from '../../core/models/nutrition.model';

@Component({
  selector: 'app-profile-form',
  imports: [FormsModule],
  templateUrl: './profile-form.html',
  styleUrl: './profile-form.scss',
})
export class ProfileFormComponent {
  protected readonly nutritionService = inject(NutritionService);
  protected readonly profile = this.nutritionService.profile;
  protected readonly toastMessage = signal<string | null>(null);

  protected readonly activityOptions: {
    level: ActivityLevel;
    label: string;
    description: string;
    multiplier: string;
    icon: string;
  }[] = [
    {
      level: 'sedentary',
      label: 'Sédentaire',
      description: 'Peu ou pas d’exercice, travail de bureau',
      multiplier: 'x1.20',
      icon: '🪑',
    },
    {
      level: 'light',
      label: 'Légèrement actif',
      description: '1 à 3 séances de sport par semaine ou marche active',
      multiplier: 'x1.375',
      icon: '🚶',
    },
    {
      level: 'moderate',
      label: 'Modérément actif',
      description: '3 à 5 séances d’entraînement par semaine',
      multiplier: 'x1.55',
      icon: '🏃',
    },
    {
      level: 'very_active',
      label: 'Très actif',
      description: '6 à 7 séances intenses ou métier très physique',
      multiplier: 'x1.725',
      icon: '🏋️',
    },
    {
      level: 'extra_active',
      label: 'Extrême / Athlète',
      description: 'Entraînement biquotidien ou travail de force soutenu',
      multiplier: 'x1.90',
      icon: '⚡',
    },
  ];

  protected readonly goalOptions: {
    goal: DietGoal;
    label: string;
    description: string;
    icon: string;
    badge: string;
  }[] = [
    {
      goal: 'fat_loss',
      label: 'Perte de masse grasse',
      description: 'Déficit maîtrisé (-20%) avec apport protéique protecteur',
      icon: '🔥',
      badge: '-400 à -500 kcal',
    },
    {
      goal: 'maintenance',
      label: 'Maintien & Équilibre',
      description: 'Stabilisation du poids, énergie et forme optimales',
      icon: '⚖️',
      badge: 'Besoins stricts',
    },
    {
      goal: 'muscle_gain',
      label: 'Prise de masse propre',
      description: 'Surplus contrôlé (+15%) pour bâtir du muscle sans gras excessif',
      icon: '💪',
      badge: '+300 à +400 kcal',
    },
  ];

  protected readonly mealFrequencyOptions: {
    count: number;
    label: string;
    detail: string;
  }[] = [
    { count: 2, label: '2 repas', detail: 'Jeûne intermittent / 2 repas copieux' },
    { count: 3, label: '3 repas', detail: 'Petit-déjeuner, Déjeuner, Dîner' },
    { count: 4, label: '4 repas', detail: '3 repas + 1 collation (recommandé)' },
    { count: 5, label: '5 repas', detail: '3 repas + 2 collations pour l’énergie' },
    { count: 6, label: '6 repas', detail: 'Apport constant toutes les 2-3 heures' },
  ];

  setGender(gender: Gender): void {
    this.nutritionService.updateProfile({ gender });
  }

  setActivityLevel(activityLevel: ActivityLevel): void {
    this.nutritionService.updateProfile({ activityLevel });
  }

  setGoal(goal: DietGoal): void {
    this.nutritionService.updateProfile({ goal });
  }

  setDietType(dietType: DietType): void {
    this.nutritionService.updateProfile({ dietType });
  }

  setMealsPerDay(mealsPerDay: number): void {
    this.nutritionService.updateProfile({ mealsPerDay });
  }

  onNumberChange(field: 'age' | 'height' | 'weight', event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    if (!isNaN(value) && value > 0) {
      this.nutritionService.updateProfile({ [field]: value });
    }
  }

  onSaveExplicitly(): void {
    this.nutritionService.saveProfileExplicitly();
    this.showToast('✅ Votre profil a été sauvegardé avec succès ! Vos données persisteront après redémarrage.');
  }

  onResetDefaults(): void {
    this.nutritionService.resetToDefaults();
    this.showToast('↺ Le profil a été réinitialisé aux valeurs d’origine.');
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }
}
