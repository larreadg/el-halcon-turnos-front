import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnosConfiguracion } from './turnos-configuracion';

describe('TurnosConfiguracion', () => {
  let component: TurnosConfiguracion;
  let fixture: ComponentFixture<TurnosConfiguracion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnosConfiguracion],
    }).compileComponents();

    fixture = TestBed.createComponent(TurnosConfiguracion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
