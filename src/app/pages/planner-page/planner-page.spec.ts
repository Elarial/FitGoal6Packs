import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { PlannerPageComponent } from './planner-page';
import { PlannerService } from '../../core/services/planner.service';
import { NutritionService } from '../../core/services/nutrition.service';

describe('PlannerPageComponent', () => {
  let component: PlannerPageComponent;
  let fixture: ComponentFixture<PlannerPageComponent>;
  let plannerService: PlannerService;
  let nutritionService: NutritionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlannerPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    plannerService = TestBed.inject(PlannerService);
    nutritionService = TestBed.inject(NutritionService);
    nutritionService.resetToDefaults();
    plannerService.clearWeeklyPlan();

    fixture = TestBed.createComponent(PlannerPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the planner component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the main hero title and 7 days', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.hero-title')?.textContent).toContain('Planifiez votre Semaine');

    const dayCards = compiled.querySelectorAll('.day-card');
    expect(dayCards.length).toBe(7);
  });

  it('should switch between planning tab and grocery list tab', () => {
    component.setActiveTab('groceries');
    fixture.detectChanges();
    expect(component['activeTab']()).toBe('groceries');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.groceries-view')).toBeTruthy();

    component.setActiveTab('planner');
    fixture.detectChanges();
    expect(compiled.querySelector('.planner-view')).toBeTruthy();
  });

  it('should display piece unit projection and permit copying when meals are planned', async () => {
    // Remplissage automatique
    plannerService.autoGenerateWeeklyPlan();
    component.setActiveTab('groceries');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const pieceBadges = compiled.querySelectorAll('.piece-unit-box');
    expect(pieceBadges.length).toBeGreaterThan(0);

    // Vérifier le texte formaté
    const text = component['formattedGroceryText']();
    expect(text).toContain('LISTE DE COURSES FITGOAL6PACKS');

    // Test de la méthode de copie avec mock navigator.clipboard
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    await component.copyGroceryListToClipboard();
    expect(mockWriteText).toHaveBeenCalled();
    expect(component['copySuccess']()).toBe(true);
  });
});
