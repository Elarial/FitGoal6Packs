import { Routes } from '@angular/router';
import { PlanPageComponent } from './pages/plan-page/plan-page';
import { RecipesPageComponent } from './pages/recipes-page/recipes-page';

export const routes: Routes = [
  {
    path: '',
    component: PlanPageComponent,
    title: 'FitGoal - Plan Nutritionnel & Calculateur',
  },
  {
    path: 'recettes',
    component: RecipesPageComponent,
    title: 'FitGoal - Recettes Culinaires Personnalisées',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
