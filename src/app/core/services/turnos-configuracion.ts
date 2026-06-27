import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  FinalizarTodosResponse,
  GuardarTurnoConfiguracionRequest,
  GuardarTurnoConfiguracionResponse,
  TurnoConfiguracion,
} from '../models/turno-configuracion.model';

@Injectable({
  providedIn: 'root',
})
export class TurnosConfiguracion {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  obtener(fecha?: string): Observable<ApiResponse<TurnoConfiguracion>> {
    const params = fecha ? new HttpParams().set('fecha', fecha) : undefined;
    return this.http.get<ApiResponse<TurnoConfiguracion>>(`${this.apiUrl}/turnos/configuracion`, {
      params,
    });
  }

  guardar(
    datos: GuardarTurnoConfiguracionRequest,
  ): Observable<ApiResponse<GuardarTurnoConfiguracionResponse>> {
    return this.http.post<ApiResponse<GuardarTurnoConfiguracionResponse>>(
      `${this.apiUrl}/turnos/configuracion`,
      datos,
    );
  }

  finalizarTodos(): Observable<ApiResponse<FinalizarTodosResponse>> {
    return this.http.post<ApiResponse<FinalizarTodosResponse>>(
      `${this.apiUrl}/turnos/finalizar-todos`,
      {},
    );
  }
}
