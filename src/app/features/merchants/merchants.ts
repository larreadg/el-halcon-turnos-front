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

import { Merchants as MerchantsService } from '../../core/services/merchants';
import { ActualizarMerchantRequest, Merchant } from '../../core/models/merchant.model';

type Modo = 'crear' | 'editar';

interface Credenciales {
  usuario: string;
  clave: string;
}

@Component({
  selector: 'app-merchants',
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
  templateUrl: './merchants.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Merchants implements OnInit {
  private readonly merchantsService = inject(MerchantsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly merchants = signal<Merchant[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly reseteando = signal<number | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly modo = signal<Modo>('crear');
  protected readonly errorMensaje = signal<string | null>(null);

  protected readonly credencialesDialogVisible = signal(false);
  protected readonly credencialesGeneradas = signal<Credenciales | null>(null);

  private merchantEditando: Merchant | null = null;

  protected readonly merchantModel = signal({
    nombres: '',
    apellidos: '',
    documento: '',
    puesto: '',
  });

  protected readonly merchantForm = form(this.merchantModel, (schema) => {
    required(schema.nombres, { message: 'Ingresá el nombre' });
    required(schema.apellidos, { message: 'Ingresá el apellido' });
    required(schema.documento, { message: 'Ingresá el documento' });
  });

  ngOnInit(): void {
    this.cargarMerchants();
  }

  protected cargarMerchants(): void {
    this.cargando.set(true);

    this.merchantsService.listar().subscribe({
      next: (respuesta) => {
        this.merchants.set(respuesta.data ?? []);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.mostrarError(error, 'No se pudo cargar la lista de merchants.');
      },
    });
  }

  protected abrirCrear(): void {
    this.modo.set('crear');
    this.merchantEditando = null;
    this.errorMensaje.set(null);
    this.merchantModel.set({ nombres: '', apellidos: '', documento: '', puesto: '' });
    this.dialogVisible.set(true);
  }

  protected abrirEditar(merchant: Merchant): void {
    this.modo.set('editar');
    this.merchantEditando = merchant;
    this.errorMensaje.set(null);
    this.merchantModel.set({
      nombres: merchant.nombres,
      apellidos: merchant.apellidos,
      documento: merchant.documento,
      puesto: merchant.puesto ?? '',
    });
    this.dialogVisible.set(true);
  }

  protected cerrarDialog(): void {
    this.dialogVisible.set(false);
  }

  protected onSubmit(): void {
    submit(this.merchantForm, async () => {
      this.guardando.set(true);
      this.errorMensaje.set(null);

      try {
        if (this.modo() === 'crear') {
          await this.crearMerchant();
        } else {
          await this.actualizarMerchant();
        }
        this.dialogVisible.set(false);
        this.cargarMerchants();
      } catch (error) {
        this.mostrarError(error, 'No se pudo guardar el merchant.', true);
      } finally {
        this.guardando.set(false);
      }
    });
  }

  private async crearMerchant(): Promise<void> {
    const { nombres, apellidos, documento, puesto } = this.merchantModel();

    const respuesta = await firstValueFrom(
      this.merchantsService.crear({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        documento: documento.trim(),
        puesto: puesto.trim(),
      }),
    );

    if (respuesta.data) {
      this.mostrarCredenciales(respuesta.data.usuario, respuesta.data.clave);
    }
  }

  private async actualizarMerchant(): Promise<void> {
    const original = this.merchantEditando;
    if (!original) {
      return;
    }

    const { nombres, apellidos, documento, puesto } = this.merchantModel();
    const datos: ActualizarMerchantRequest = {};

    if (nombres.trim() !== original.nombres) {
      datos.nombres = nombres.trim();
    }
    if (apellidos.trim() !== original.apellidos) {
      datos.apellidos = apellidos.trim();
    }
    if (documento.trim() !== original.documento) {
      datos.documento = documento.trim();
    }
    if (puesto.trim() !== (original.puesto ?? '')) {
      datos.puesto = puesto.trim();
    }

    if (Object.keys(datos).length === 0) {
      return;
    }

    await firstValueFrom(this.merchantsService.actualizar(original.id, datos));

    this.messageService.add({
      severity: 'success',
      summary: 'Merchant actualizado',
      detail: `Se actualizó el merchant "${original.usuario}".`,
    });
  }

  protected confirmarEliminar(merchant: Merchant): void {
    this.confirmationService.confirm({
      header: 'Eliminar merchant',
      message: `¿Seguro que querés eliminar el merchant "${merchant.usuario}"? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminarMerchant(merchant),
    });
  }

  private eliminarMerchant(merchant: Merchant): void {
    this.merchantsService.eliminar(merchant.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Merchant eliminado',
          detail: `Se eliminó el merchant "${merchant.usuario}".`,
        });
        this.cargarMerchants();
      },
      error: (error: unknown) => {
        this.mostrarError(error, 'No se pudo eliminar el merchant.', true);
      },
    });
  }

  protected confirmarResetearClave(merchant: Merchant): void {
    this.confirmationService.confirm({
      header: 'Resetear contraseña',
      message: `¿Generar una nueva contraseña para "${merchant.usuario}"? La contraseña actual dejará de funcionar.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Resetear',
      rejectLabel: 'Cancelar',
      accept: () => this.resetearClave(merchant),
    });
  }

  private resetearClave(merchant: Merchant): void {
    this.reseteando.set(merchant.id);

    this.merchantsService.resetearClave(merchant.id).subscribe({
      next: (respuesta) => {
        this.reseteando.set(null);
        if (respuesta.data) {
          this.mostrarCredenciales(merchant.usuario, respuesta.data.clave);
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
