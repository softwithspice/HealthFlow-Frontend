import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NutritionistDashboard } from './nutritionist-dashboard';

describe('NutritionistDashboard', () => {
  let component: NutritionistDashboard;
  let fixture: ComponentFixture<NutritionistDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutritionistDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NutritionistDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
