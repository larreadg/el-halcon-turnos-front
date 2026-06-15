import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PantallaTurnos } from './pantalla-turnos';

describe('PantallaTurnos', () => {
  let component: PantallaTurnos;
  let fixture: ComponentFixture<PantallaTurnos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PantallaTurnos],
    }).compileComponents();

    fixture = TestBed.createComponent(PantallaTurnos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
