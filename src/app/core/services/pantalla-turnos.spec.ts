import { TestBed } from '@angular/core/testing';

import { PantallaTurnosService } from './pantalla-turnos';

describe('PantallaTurnosService', () => {
  let service: PantallaTurnosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PantallaTurnosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
