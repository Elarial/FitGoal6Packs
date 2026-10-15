import { Component, inject, computed } from '@angular/core';
import { NutritionService } from '../../core/services/nutrition.service';

@Component({
  selector: 'app-nutrition-dashboard',
  templateUrl: './nutrition-dashboard.html',
  styleUrl: './nutrition-dashboard.scss',
})
export class NutritionDashboardComponent {
  protected readonly nutritionService = inject(NutritionService);
  protected readonly plan = this.nutritionService.plan;

  protected readonly proteinPerKg = computed(() => {
    const weight = this.plan().userProfile.weight;
    const protein = this.plan().macros.protein;
    return (protein / Math.max(weight, 1)).toFixed(1);
  });

  protected readonly fatsPerKg = computed(() => {
    const weight = this.plan().userProfile.weight;
    const fats = this.plan().macros.fats;
    return (fats / Math.max(weight, 1)).toFixed(1);
  });
}
