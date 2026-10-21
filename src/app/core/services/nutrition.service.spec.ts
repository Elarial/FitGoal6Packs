import { TestBed } from '@angular/core/testing';
import { NutritionService } from './nutrition.service';

describe('NutritionService', () => {
  let service: NutritionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(NutritionService);
    service.resetToDefaults();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created with default profile', () => {
    expect(service).toBeTruthy();
    expect(service.profile().gender).toBe('male');
    expect(service.profile().mealsPerDay).toBe(4);
  });

  it('should calculate BMR and TDEE correctly for a standard profile', () => {
    service.updateProfile({
      gender: 'male',
      age: 30,
      height: 180,
      weight: 80,
      activityLevel: 'moderate', // 1.55
      goal: 'maintenance',
    });

    const plan = service.plan();
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(plan.bmr).toBe(1780);
    // TDEE = 1780 * 1.55 = 2759
    expect(plan.tdee).toBe(2759);
    expect(plan.targetCalories).toBe(2759);
  });

  it('should adjust calories for fat_loss with a deficit', () => {
    service.updateProfile({
      gender: 'male',
      age: 28,
      height: 178,
      weight: 75,
      activityLevel: 'moderate',
      goal: 'fat_loss',
    });

    const plan = service.plan();
    expect(plan.calorieDelta).toBeLessThan(0);
    expect(plan.targetCalories).toBeLessThan(plan.tdee);
  });

  it('should distribute macros into specified meals per day', () => {
    service.updateProfile({ mealsPerDay: 5 });
    const plan = service.plan();
    expect(plan.meals.length).toBe(5);

    const totalMealCalories = plan.meals.reduce((sum, m) => sum + m.calories, 0);
    // Allow slight rounding tolerance (+/- 5 kcal)
    expect(Math.abs(totalMealCalories - plan.targetCalories)).toBeLessThanOrEqual(5);
  });

  it('should update BMI and classification accurately', () => {
    service.updateProfile({
      height: 175,
      weight: 70,
    });
    const plan = service.plan();
    // BMI = 70 / (1.75 * 1.75) = 22.86 -> 22.9
    expect(plan.bmi).toBe(22.9);
    expect(plan.bmiCategory).toBe('Poids santé');
  });

  it('should persist profile to localStorage with timestamp on update', () => {
    service.updateProfile({
      weight: 82,
      height: 185,
      age: 32,
    });

    const storedRaw = localStorage.getItem('fitgoal_user_profile');
    expect(storedRaw).toBeTruthy();
    const parsed = JSON.parse(storedRaw!);
    expect(parsed.userProfile).toBeDefined();
    expect(parsed.userProfile.weight).toBe(82);
    expect(parsed.userProfile.height).toBe(185);
    expect(parsed.version).toBe('1.0');
    expect(service.lastSavedTimestamp()).toBeTruthy();
  });

  it('should export and import user profile data successfully', () => {
    service.updateProfile({
      weight: 90,
      goal: 'muscle_gain',
      mealsPerDay: 5,
    });

    const exported = service.exportUserData();
    expect(exported).toContain('"weight": 90');
    expect(exported.includes('muscle_gain')).toBe(true);

    // Reset then import
    service.resetToDefaults();
    expect(service.profile().weight).toBe(75);

    const success = service.importUserData(exported);
    expect(success).toBe(true);
    expect(service.profile().weight).toBe(90);
    expect(service.profile().goal).toBe('muscle_gain');
    expect(service.profile().mealsPerDay).toBe(5);
  });
});
