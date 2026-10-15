import { Component } from '@angular/core';
import { ProfileFormComponent } from '../../components/profile-form/profile-form';
import { NutritionDashboardComponent } from '../../components/nutrition-dashboard/nutrition-dashboard';

@Component({
  selector: 'app-plan-page',
  imports: [ProfileFormComponent, NutritionDashboardComponent],
  templateUrl: './plan-page.html',
  styleUrl: './plan-page.scss',
})
export class PlanPageComponent {}
