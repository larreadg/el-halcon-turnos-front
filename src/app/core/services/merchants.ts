import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  ActualizarMerchantRequest,
  CrearMerchantRequest,
  CrearMerchantResponse,
  Merchant,
  ResetearClaveResponse,
} from '../models/merchant.model';

@Injectable({
  providedIn: 'root',
})
export class Merchants {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listar(): Observable<ApiResponse<Merchant[]>> {
    return this.http.get<ApiResponse<Merchant[]>>(`${this.apiUrl}/merchants`);
  }

  obtener(id: number): Observable<ApiResponse<Merchant>> {
    return this.http.get<ApiResponse<Merchant>>(`${this.apiUrl}/merchants/${id}`);
  }

  crear(datos: CrearMerchantRequest): Observable<ApiResponse<CrearMerchantResponse>> {
    return this.http.post<ApiResponse<CrearMerchantResponse>>(`${this.apiUrl}/merchants`, datos);
  }

  actualizar(id: number, datos: ActualizarMerchantRequest): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.apiUrl}/merchants/${id}`, datos);
  }

  eliminar(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/merchants/${id}`);
  }

  resetearClave(id: number): Observable<ApiResponse<ResetearClaveResponse>> {
    return this.http.post<ApiResponse<ResetearClaveResponse>>(
      `${this.apiUrl}/merchants/${id}/resetear-clave`,
      {},
    );
  }
}
