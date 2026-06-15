import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FormField, form, min, required, submit } from '@angular/forms/signals';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { TurnosConfiguracion as TurnosConfiguracionService } from '../../core/services/turnos-configuracion';
import { TurnoConfiguracion } from '../../core/models/turno-configuracion.model';

@Component({
  selector: 'app-turnos-configuracion',
  imports: [
    FormField,
    ButtonModule,
    CardModule,
    InputTextModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './turnos-configuracion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnosConfiguracion implements OnInit {
  private readonly turnosConfiguracionService = inject(TurnosConfiguracionService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly configuracion = signal<TurnoConfiguracion | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);

  protected readonly numeroModel = signal({ numeroInicial: 1 });

  protected readonly numeroForm = form(this.numeroModel, (schema) => {
    required(schema.numeroInicial, { message: 'Ingresá el número inicial' });
    min(schema.numeroInicial, 1, { message: 'El número inicial debe ser mayor o igual a 1' });
  });

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  protected cargarConfiguracion(): void {
    this.cargando.set(true);

    this.turnosConfiguracionService.obtener().subscribe({
      next: (respuesta) => {
        this.configuracion.set(respuesta.data);
        if (respuesta.data) {
          this.numeroModel.set({ numeroInicial: respuesta.data.numero_inicial });
        }
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.cargando.set(false);

        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.configuracion.set(null);
          return;
        }

        this.mostrarError(error, 'No se pudo obtener la configuración de turnos.');
      },
    });
  }

  protected onSubmit(): void {
    submit(this.numeroForm, async () => {
      const actual = this.configuracion();
      const nuevo = this.numeroModel().numeroInicial;

      if (actual) {
        this.confirmarReinicio(actual.numero_inicial, nuevo);
        return;
      }

      await this.guardarConfiguracion();
    });
  }

  private confirmarReinicio(actual: number, nuevo: number): void {
    this.confirmationService.confirm({
      header: 'Reiniciar numeración',
      message: `Ya hay una numeración activa desde el N°${actual}. ¿Reiniciar y arrancar desde N°${nuevo}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reiniciar',
      rejectLabel: 'Cancelar',
      accept: () => {
        void this.guardarConfiguracion();
      },
    });
  }

  private async guardarConfiguracion(): Promise<void> {
    this.guardando.set(true);

    try {
      await firstValueFrom(
        this.turnosConfiguracionService.guardar({
          numero_inicial: this.numeroModel().numeroInicial,
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Configuración guardada',
        detail: 'Se actualizó el número inicial de turnos.',
      });

      this.cargarConfiguracion();
    } catch (error) {
      this.mostrarError(error, 'No se pudo guardar la configuración.');
    } finally {
      this.guardando.set(false);
    }
  }

  private mostrarError(error: unknown, fallback: string): void {
    const mensaje =
      error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
        ? error.error.message
        : fallback;

    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }
}
