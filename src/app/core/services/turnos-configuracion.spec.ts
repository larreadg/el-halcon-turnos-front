import { TestBed } from '@angular/core/testing';

import { TurnosConfiguracion } from './turnos-configuracion';

describe('TurnosConfiguracion', () => {
  let service: TurnosConfiguracion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TurnosConfiguracion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
