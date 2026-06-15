import { TestBed } from '@angular/core/testing';

import { Merchants } from './merchants';

describe('Merchants', () => {
  let service: Merchants;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Merchants);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
