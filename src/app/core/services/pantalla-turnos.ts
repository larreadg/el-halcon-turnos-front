import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PantallaTurnos } from '../models/pantalla-turnos.model';

@Injectable({
  providedIn: 'root',
})
export class PantallaTurnosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  obtener(): Observable<ApiResponse<PantallaTurnos>> {
    return this.http.get<ApiResponse<PantallaTurnos>>(`${this.apiUrl}/turnos/pantalla`);
  }
}
