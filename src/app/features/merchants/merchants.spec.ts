import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Merchants } from './merchants';

describe('Merchants', () => {
  let component: Merchants;
  let fixture: ComponentFixture<Merchants>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Merchants],
    }).compileComponents();

    fixture = TestBed.createComponent(Merchants);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
