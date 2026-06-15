import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { CaptchaData, LoginRequest, LoginResponse } from '../models/auth.model';

const TOKEN_KEY = 'halcon_token';
const USUARIO_KEY = 'halcon_usuario';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly usuarioSignal = signal<string | null>(localStorage.getItem(USUARIO_KEY));

  readonly token = this.tokenSignal.asReadonly();
  readonly usuario = this.usuarioSignal.asReadonly();
  readonly estaAutenticado = computed(() => !!this.tokenSignal());

  obtenerCaptcha(): Observable<ApiResponse<CaptchaData>> {
    return this.http.get<ApiResponse<CaptchaData>>(`${this.apiUrl}/auth/captcha`);
  }

  login(credenciales: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.apiUrl}/auth/login`, credenciales)
      .pipe(
        tap((respuesta) => {
          if (respuesta.data) {
            this.guardarSesion(respuesta.data);
          }
        }),
      );
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.usuarioSignal.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
  }

  private guardarSesion(datos: LoginResponse): void {
    this.tokenSignal.set(datos.token);
    this.usuarioSignal.set(datos.usuario);
    localStorage.setItem(TOKEN_KEY, datos.token);
    localStorage.setItem(USUARIO_KEY, datos.usuario);
  }
}
