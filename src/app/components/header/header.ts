import { Component, inject } from '@angular/core';
import { NutritionService } from '../../core/services/nutrition.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  protected readonly nutritionService = inject(NutritionService);
  protected readonly plan = this.nutritionService.plan;
}
