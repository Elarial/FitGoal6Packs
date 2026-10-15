import { Component } from '@angular/core';
import { HeaderComponent } from './components/header/header';
import { ProfileFormComponent } from './components/profile-form/profile-form';
import { NutritionDashboardComponent } from './components/nutrition-dashboard/nutrition-dashboard';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, ProfileFormComponent, NutritionDashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
