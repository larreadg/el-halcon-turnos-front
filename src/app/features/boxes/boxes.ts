import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { Boxes as BoxesService } from '../../core/services/boxes';
import { ActualizarBoxRequest, Box } from '../../core/models/box.model';

type Modo = 'crear' | 'editar';

interface Credenciales {
  usuario: string;
  clave: string;
}

@Component({
  selector: 'app-boxes',
  imports: [
    FormField,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    TagModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './boxes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Boxes implements OnInit {
  private readonly boxesService = inject(BoxesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly boxes = signal<Box[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly reseteando = signal<number | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly modo = signal<Modo>('crear');
  protected readonly errorMensaje = signal<string | null>(null);

  protected readonly credencialesDialogVisible = signal(false);
  protected readonly credencialesGeneradas = signal<Credenciales | null>(null);

  private boxEditando: Box | null = null;

  protected readonly boxModel = signal({ puesto: '' });

  protected readonly boxForm = form(this.boxModel, (schema) => {
    required(schema.puesto, { message: 'Ingresá el nombre del box' });
  });

  ngOnInit(): void {
    this.cargarBoxes();
  }

  protected cargarBoxes(): void {
    this.cargando.set(true);

    this.boxesService.listar().subscribe({
      next: (respuesta) => {
        this.boxes.set(respuesta.data ?? []);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.mostrarError(error, 'No se pudo cargar la lista de boxes.');
      },
    });
  }

  protected abrirCrear(): void {
    this.modo.set('crear');
    this.boxEditando = null;
    this.errorMensaje.set(null);
    this.boxModel.set({ puesto: '' });
    this.dialogVisible.set(true);
  }

  protected abrirEditar(box: Box): void {
    this.modo.set('editar');
    this.boxEditando = box;
    this.errorMensaje.set(null);
    this.boxModel.set({ puesto: box.puesto ?? '' });
    this.dialogVisible.set(true);
  }

  protected cerrarDialog(): void {
    this.dialogVisible.set(false);
  }

  protected onSubmit(): void {
    submit(this.boxForm, async () => {
      this.guardando.set(true);
      this.errorMensaje.set(null);

      try {
        if (this.modo() === 'crear') {
          await this.crearBox();
        } else {
          await this.actualizarBox();
        }
        this.dialogVisible.set(false);
        this.cargarBoxes();
      } catch (error) {
        this.mostrarError(error, 'No se pudo guardar el box.', true);
      } finally {
        this.guardando.set(false);
      }
    });
  }

  private async crearBox(): Promise<void> {
    const { puesto } = this.boxModel();

    const respuesta = await firstValueFrom(
      this.boxesService.crear({ puesto: puesto.trim() }),
    );

    if (respuesta.data) {
      this.mostrarCredenciales(respuesta.data.usuario, respuesta.data.clave);
    }
  }

  private async actualizarBox(): Promise<void> {
    const original = this.boxEditando;
    if (!original) return;

    const { puesto } = this.boxModel();
    const datos: ActualizarBoxRequest = {};

    if (puesto.trim() !== (original.puesto ?? '')) {
      datos.puesto = puesto.trim();
    }

    if (Object.keys(datos).length === 0) return;

    await firstValueFrom(this.boxesService.actualizar(original.id, datos));

    this.messageService.add({
      severity: 'success',
      summary: 'Box actualizado',
      detail: `Se actualizó el box "${original.usuario}".`,
    });
  }

  protected confirmarEliminar(box: Box): void {
    this.confirmationService.confirm({
      header: 'Eliminar box',
      message: `¿Seguro que querés eliminar el box "${box.usuario}"? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminarBox(box),
    });
  }

  private eliminarBox(box: Box): void {
    this.boxesService.eliminar(box.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Box eliminado',
          detail: `Se eliminó el box "${box.usuario}".`,
        });
        this.cargarBoxes();
      },
      error: (error: unknown) => {
        this.mostrarError(error, 'No se pudo eliminar el box.', true);
      },
    });
  }

  protected confirmarResetearClave(box: Box): void {
    this.confirmationService.confirm({
      header: 'Resetear contraseña',
      message: `¿Generar una nueva contraseña para "${box.usuario}"? La contraseña actual dejará de funcionar.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Resetear',
      rejectLabel: 'Cancelar',
      accept: () => this.resetearClave(box),
    });
  }

  private resetearClave(box: Box): void {
    this.reseteando.set(box.id);

    this.boxesService.resetearClave(box.id).subscribe({
      next: (respuesta) => {
        this.reseteando.set(null);
        if (respuesta.data) {
          this.mostrarCredenciales(box.usuario, respuesta.data.clave);
        }
      },
      error: (error: unknown) => {
        this.reseteando.set(null);
        this.mostrarError(error, 'No se pudo resetear la contraseña.');
      },
    });
  }

  private mostrarCredenciales(usuario: string, clave: string): void {
    this.credencialesGeneradas.set({ usuario, clave });
    this.credencialesDialogVisible.set(true);
  }

  protected cerrarCredenciales(): void {
    this.credencialesDialogVisible.set(false);
    this.credencialesGeneradas.set(null);
  }

  protected async copiar(valor: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(valor);
      this.messageService.add({
        severity: 'success',
        summary: 'Copiado',
        detail: 'Se copió al portapapeles.',
        life: 2000,
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo copiar al portapapeles.',
      });
    }
  }

  private mostrarError(error: unknown, fallback: string, enDialogo = false): void {
    const mensaje =
      error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
        ? error.error.message
        : fallback;

    if (enDialogo) {
      this.errorMensaje.set(mensaje);
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
    }
  }
}
