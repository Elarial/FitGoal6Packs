import { Routes } from '@angular/router';
import { PlanPageComponent } from './pages/plan-page/plan-page';
import { RecipesPageComponent } from './pages/recipes-page/recipes-page';
import { PlannerPageComponent } from './pages/planner-page/planner-page';

export const routes: Routes = [
  {
    path: '',
    component: PlanPageComponent,
    title: 'FitGoal6Packs - Plan Nutritionnel & Calculateur',
  },
  {
    path: 'planning',
    component: PlannerPageComponent,
    title: 'FitGoal6Packs - Planificateur Hebdomadaire & Courses',
  },
  {
    path: 'recettes',
    component: RecipesPageComponent,
    title: 'FitGoal6Packs - Recettes Culinaires Personnalisées',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
