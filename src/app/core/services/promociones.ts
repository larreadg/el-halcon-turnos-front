import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  ActualizarPromocionRequest,
  CrearPromocionRequest,
  Promocion,
  PromocionArchivo,
  PromocionPantalla,
} from '../models/promocion.model';

@Injectable({
  providedIn: 'root',
})
export class Promociones {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listar(): Observable<ApiResponse<Promocion[]>> {
    return this.http.get<ApiResponse<Promocion[]>>(`${this.apiUrl}/promociones`);
  }

  listarPantalla(): Observable<ApiResponse<PromocionPantalla[]>> {
    return this.http.get<ApiResponse<PromocionPantalla[]>>(`${this.apiUrl}/promociones/pantalla`);
  }

  /** Sube la promoción como multipart; emite eventos para poder mostrar el progreso. */
  crear(datos: CrearPromocionRequest): Observable<HttpEvent<ApiResponse<Promocion>>> {
    const formData = this.formDataArchivos(datos.archivos);
    formData.append('titulo', datos.titulo);
    formData.append('duracion_segundos', String(datos.duracion_segundos));
    formData.append('orden', String(datos.orden));
    formData.append('activo', datos.activo ? '1' : '0');
    formData.append('fecha_desde', datos.fecha_desde ?? '');
    formData.append('fecha_hasta', datos.fecha_hasta ?? '');
    formData.append('dias_semana', datos.dias_semana.join(','));

    return this.http.post<ApiResponse<Promocion>>(`${this.apiUrl}/promociones`, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  actualizar(id: number, datos: ActualizarPromocionRequest): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.apiUrl}/promociones/${id}`, datos);
  }

  /** Activa o desactiva varias promociones a la vez. */
  cambiarEstado(ids: number[], activo: boolean): Observable<ApiResponse<{ modificadas: number }>> {
    return this.http.put<ApiResponse<{ modificadas: number }>>(
      `${this.apiUrl}/promociones/estado`,
      { ids, activo },
    );
  }

  eliminar(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/promociones/${id}`);
  }

  /** Agrega archivos al final de la promoción; devuelve los creados en el mismo orden. */
  agregarArchivos(
    id: number,
    archivos: File[],
  ): Observable<HttpEvent<ApiResponse<PromocionArchivo[]>>> {
    return this.http.post<ApiResponse<PromocionArchivo[]>>(
      `${this.apiUrl}/promociones/${id}/archivos`,
      this.formDataArchivos(archivos),
      { reportProgress: true, observe: 'events' },
    );
  }

  ordenarArchivos(id: number, ids: number[]): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.apiUrl}/promociones/${id}/archivos/orden`, {
      ids,
    });
  }

  eliminarArchivo(id: number, archivoId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiUrl}/promociones/${id}/archivos/${archivoId}`,
    );
  }

  urlArchivo(archivoId: number): string {
    return `${this.apiUrl}/promociones/archivos/${archivoId}`;
  }

  private formDataArchivos(archivos: File[]): FormData {
    const formData = new FormData();
    for (const archivo of archivos) {
      formData.append('archivos[]', archivo);
    }
    return formData;
  }
}
