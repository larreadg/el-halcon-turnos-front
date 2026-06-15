import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';

import { Auth } from '../../../core/services/auth';
import { CaptchaData } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  imports: [FormField, ButtonModule, InputTextModule, MessageModule, SkeletonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);

  protected readonly credenciales = signal({
    usuario: '',
    clave: '',
    captchaRespuesta: '',
  });

  protected readonly loginForm = form(this.credenciales, (schema) => {
    required(schema.usuario, { message: 'Ingresá tu usuario' });
    required(schema.clave, { message: 'Ingresá tu clave' });
    required(schema.captchaRespuesta, { message: 'Ingresá el código de la imagen' });
  });

  protected readonly captcha = signal<CaptchaData | null>(null);
  protected readonly cargandoCaptcha = signal(false);
  protected readonly enviando = signal(false);
  protected readonly errorMensaje = signal<string | null>(null);
  protected readonly mostrarClave = signal(false);

  constructor() {
    this.refrescarCaptcha();
  }

  protected refrescarCaptcha(): void {
    this.cargandoCaptcha.set(true);
    this.errorMensaje.set(null);

    this.authService.obtenerCaptcha().subscribe({
      next: (respuesta) => {
        this.captcha.set(respuesta.data);
        this.credenciales.update((actual) => ({ ...actual, captchaRespuesta: '' }));
        this.cargandoCaptcha.set(false);
      },
      error: () => {
        this.captcha.set(null);
        this.cargandoCaptcha.set(false);
        this.errorMensaje.set('No se pudo cargar la verificación. Probá nuevamente.');
      },
    });
  }

  protected alternarClave(): void {
    this.mostrarClave.update((valor) => !valor);
  }

  protected onSubmit(): void {
    submit(this.loginForm, async () => {
      const captchaActual = this.captcha();
      if (!captchaActual) {
        this.errorMensaje.set('No se pudo cargar la verificación. Probá nuevamente.');
        return;
      }

      this.enviando.set(true);
      this.errorMensaje.set(null);

      const { usuario, clave, captchaRespuesta } = this.credenciales();

      try {
        await firstValueFrom(
          this.authService.login({
            usuario,
            clave,
            captcha_token: captchaActual.captcha_token,
            captcha_respuesta: captchaRespuesta,
          }),
        );
        this.router.navigate(['/home']);
      } catch (error) {
        this.errorMensaje.set(this.obtenerMensajeError(error));
        this.refrescarCaptcha();
      } finally {
        this.enviando.set(false);
      }
    });
  }

  private obtenerMensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return 'No se pudo iniciar sesión. Intentá nuevamente.';
  }
}
