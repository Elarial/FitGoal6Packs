import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PlanPageComponent } from './pages/plan-page/plan-page';
import { RecipesPageComponent } from './pages/recipes-page/recipes-page';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, PlanPageComponent, RecipesPageComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render brand title in navbar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-title')?.textContent).toContain('Fit');
  });

  it('should create PlanPageComponent with main title', () => {
    const fixture = TestBed.createComponent(PlanPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Votre Plan Nutritionnel');
  });

  it('should create RecipesPageComponent and display recipes', () => {
    const fixture = TestBed.createComponent(RecipesPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.hero-title')?.textContent).toContain('Recettes');
    expect(compiled.querySelectorAll('.recipe-card').length).toBeGreaterThan(0);
  });
});
