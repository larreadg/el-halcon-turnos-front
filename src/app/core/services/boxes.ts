import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  ActualizarBoxRequest,
  Box,
  CrearBoxRequest,
  CrearBoxResponse,
  ResetearClaveBoxResponse,
} from '../models/box.model';

@Injectable({
  providedIn: 'root',
})
export class Boxes {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listar(): Observable<ApiResponse<Box[]>> {
    return this.http.get<ApiResponse<Box[]>>(`${this.apiUrl}/boxes`);
  }

  obtener(id: number): Observable<ApiResponse<Box>> {
    return this.http.get<ApiResponse<Box>>(`${this.apiUrl}/boxes/${id}`);
  }

  crear(datos: CrearBoxRequest): Observable<ApiResponse<CrearBoxResponse>> {
    return this.http.post<ApiResponse<CrearBoxResponse>>(`${this.apiUrl}/boxes`, datos);
  }

  actualizar(id: number, datos: ActualizarBoxRequest): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.apiUrl}/boxes/${id}`, datos);
  }

  eliminar(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/boxes/${id}`);
  }

  resetearClave(id: number): Observable<ApiResponse<ResetearClaveBoxResponse>> {
    return this.http.post<ApiResponse<ResetearClaveBoxResponse>>(
      `${this.apiUrl}/boxes/${id}/resetear-clave`,
      {},
    );
  }
}
