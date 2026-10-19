import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, filter, firstValueFrom, lastValueFrom, map, tap } from 'rxjs';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ProgressBarModule } from 'primeng/progressbar';
import { ConfirmationService, MessageService } from 'primeng/api';

import { Promociones as PromocionesService } from '../../core/services/promociones';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  ActualizarPromocionRequest,
  Promocion,
  PromocionArchivo,
  TipoPromocion,
} from '../../core/models/promocion.model';

type Modo = 'crear' | 'editar';

/** Archivo en la lista del diálogo: uno ya guardado (id) o uno nuevo por subir (archivo). */
interface ItemArchivo {
  clave: string;
  tipo: TipoPromocion;
  url: string;
  nombre: string;
  id?: number;
  archivo?: File;
}

const TAMANO_MAXIMO_MB = 50;
const MAXIMO_ARCHIVOS_POR_SUBIDA = 20;
/** Tamaño exacto del área del carrusel en la pantalla de turnos (debe coincidir con el backend). */
const ANCHO_REQUERIDO = 1200;
const ALTO_REQUERIDO = 1080;
const MIMES_PERMITIDOS: Record<string, TipoPromocion> = {
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/webp': 'imagen',
  'image/gif': 'imagen',
  'video/mp4': 'video',
  'video/webm': 'video',
};

@Component({
  selector: 'app-promociones',
  imports: [
    NgTemplateOutlet,
    FormField,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    TagModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
    ToggleSwitchModule,
    ProgressBarModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './promociones.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Promociones implements OnInit {
  private readonly promocionesService = inject(PromocionesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly acceptArchivos = Object.keys(MIMES_PERMITIDOS).join(',');
  protected readonly tamanoMaximoMb = TAMANO_MAXIMO_MB;
  protected readonly tamanoRequerido = `${ANCHO_REQUERIDO} × ${ALTO_REQUERIDO} px`;

  protected readonly promociones = signal<Promocion[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly progreso = signal<number | null>(null);
  protected readonly cambiandoEstado = signal<number | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly modo = signal<Modo>('crear');
  protected readonly errorMensaje = signal<string | null>(null);

  protected readonly vistaPreviaVisible = signal(false);
  protected readonly promocionVistaPrevia = signal<Promocion | null>(null);

  protected readonly items = signal<ItemArchivo[]>([]);
  protected readonly archivoError = signal<string | null>(null);
  protected readonly tieneImagenes = computed(() => this.items().some((i) => i.tipo === 'imagen'));

  private promocionEditando: Promocion | null = null;
  private contadorClaves = 0;

  protected readonly promocionModel = signal({
    titulo: '',
    duracion: 10,
    orden: 0,
    activo: true,
  });

  protected readonly promocionForm = form(this.promocionModel, (schema) => {
    required(schema.titulo, { message: 'Ingresá un título para la promoción' });
    maxLength(schema.titulo, 120, { message: 'El título no puede superar los 120 caracteres' });
    required(schema.duracion, { message: 'Ingresá la duración' });
    min(schema.duracion, 1, { message: 'La duración mínima es 1 segundo' });
    max(schema.duracion, 300, { message: 'La duración máxima es 300 segundos' });
    min(schema.orden, 0, { message: 'El orden debe ser mayor o igual a 0' });
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.limpiarItems());
  }

  ngOnInit(): void {
    this.cargarPromociones();
  }

  protected urlArchivo(archivo: PromocionArchivo): string {
    return this.promocionesService.urlArchivo(archivo.id);
  }

  protected resumenContenido(promocion: Promocion): string {
    const imagenes = promocion.archivos.filter((a) => a.tipo === 'imagen').length;
    const videos = promocion.archivos.length - imagenes;
    const partes: string[] = [];

    if (imagenes) partes.push(`${imagenes} ${imagenes === 1 ? 'imagen' : 'imágenes'}`);
    if (videos) partes.push(`${videos} ${videos === 1 ? 'video' : 'videos'}`);

    return partes.join(' · ') || 'Sin archivos';
  }

  protected cargarPromociones(): void {
    this.cargando.set(true);

    this.promocionesService.listar().subscribe({
      next: (respuesta) => {
        this.promociones.set(respuesta.data ?? []);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.mostrarError(error, 'No se pudo cargar la lista de promociones.');
      },
    });
  }

  protected abrirCrear(): void {
    this.modo.set('crear');
    this.promocionEditando = null;
    this.errorMensaje.set(null);
    this.limpiarItems();

    const siguienteOrden = this.promociones().reduce(
      (maximo, p) => Math.max(maximo, p.orden + 1),
      0,
    );
    this.promocionModel.set({ titulo: '', duracion: 10, orden: siguienteOrden, activo: true });
    this.dialogVisible.set(true);
  }

  protected abrirEditar(promocion: Promocion): void {
    this.modo.set('editar');
    this.promocionEditando = promocion;
    this.errorMensaje.set(null);
    this.limpiarItems();
    this.items.set(
      promocion.archivos.map((archivo, i) => ({
        clave: `existente-${archivo.id}`,
        tipo: archivo.tipo,
        url: this.urlArchivo(archivo),
        nombre: `Archivo ${i + 1}`,
        id: archivo.id,
      })),
    );
    this.promocionModel.set({
      titulo: promocion.titulo,
      duracion: promocion.duracion_segundos,
      orden: promocion.orden,
      activo: promocion.activo === 1,
    });
    this.dialogVisible.set(true);
  }

  protected cerrarDialog(): void {
    this.onDialogVisibleChange(false);
  }

  protected onDialogVisibleChange(visible: boolean): void {
    this.dialogVisible.set(visible);
    if (!visible) {
      this.limpiarItems();
    }
  }

  protected abrirVistaPrevia(promocion: Promocion): void {
    this.promocionVistaPrevia.set(promocion);
    this.vistaPreviaVisible.set(true);
  }

  protected onVistaPreviaVisibleChange(visible: boolean): void {
    this.vistaPreviaVisible.set(visible);
    if (!visible) {
      this.promocionVistaPrevia.set(null);
    }
  }

  protected async onArchivosSeleccionados(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const seleccionados = Array.from(input.files ?? []);
    input.value = '';
    this.archivoError.set(null);

    const formatoInvalido: string[] = [];
    const medidaInvalida: string[] = [];
    const nuevos: ItemArchivo[] = [];

    for (const archivo of seleccionados) {
      const tipo = MIMES_PERMITIDOS[archivo.type];
      if (!tipo || archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
        formatoInvalido.push(archivo.name);
        continue;
      }

      const url = URL.createObjectURL(archivo);
      const medida = await this.medir(tipo, url);

      if (!medida || medida.ancho !== ANCHO_REQUERIDO || medida.alto !== ALTO_REQUERIDO) {
        URL.revokeObjectURL(url);
        medidaInvalida.push(
          medida ? `${archivo.name} (${medida.ancho} × ${medida.alto})` : archivo.name,
        );
        continue;
      }

      nuevos.push({
        clave: `nuevo-${++this.contadorClaves}`,
        tipo,
        url,
        nombre: archivo.name,
        archivo,
      });
    }

    const pendientes = this.items().filter((i) => i.archivo).length + nuevos.length;
    if (pendientes > MAXIMO_ARCHIVOS_POR_SUBIDA) {
      nuevos.forEach((i) => URL.revokeObjectURL(i.url));
      this.archivoError.set(`Podés agregar hasta ${MAXIMO_ARCHIVOS_POR_SUBIDA} archivos a la vez.`);
      return;
    }

    const errores: string[] = [];
    if (formatoInvalido.length) {
      errores.push(
        `Se omitieron ${formatoInvalido.join(', ')}: formato no soportado o más de ${TAMANO_MAXIMO_MB} MB.`,
      );
    }
    if (medidaInvalida.length) {
      errores.push(
        `Se omitieron ${medidaInvalida.join(', ')}: deben medir exactamente ${this.tamanoRequerido}.`,
      );
    }
    this.archivoError.set(errores.length ? errores.join(' ') : null);

    if (!nuevos.length) return;

    this.items.update((actuales) => [...actuales, ...nuevos]);

    if (!this.promocionModel().titulo.trim()) {
      const nombre = nuevos[0].nombre.replace(/\.[^.]+$/, '');
      this.promocionModel.update((m) => ({ ...m, titulo: nombre }));
    }
  }

  /** Lee el ancho y alto real de una imagen o video local; null si no se puede leer. */
  private medir(tipo: TipoPromocion, url: string): Promise<{ ancho: number; alto: number } | null> {
    return new Promise((resolve) => {
      if (tipo === 'imagen') {
        const imagen = new Image();
        imagen.onload = () => resolve({ ancho: imagen.naturalWidth, alto: imagen.naturalHeight });
        imagen.onerror = () => resolve(null);
        imagen.src = url;
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve({ ancho: video.videoWidth, alto: video.videoHeight });
      video.onerror = () => resolve(null);
      video.src = url;
    });
  }

  protected moverItem(indice: number, direccion: -1 | 1): void {
    this.items.update((actuales) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= actuales.length) return actuales;

      const copia = [...actuales];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  protected quitarItem(item: ItemArchivo): void {
    if (item.archivo) {
      URL.revokeObjectURL(item.url);
    }
    this.items.update((actuales) => actuales.filter((i) => i.clave !== item.clave));
  }

  protected onSubmit(): void {
    if (this.items().length === 0) {
      this.archivoError.set('Agregá al menos una imagen o un video.');
      return;
    }

    submit(this.promocionForm, async () => {
      this.guardando.set(true);
      this.errorMensaje.set(null);

      try {
        if (this.modo() === 'crear') {
          await this.crearPromocion();
        } else {
          await this.actualizarPromocion();
        }
        this.onDialogVisibleChange(false);
      } catch (error) {
        this.mostrarError(error, 'No se pudo guardar la promoción.', true);
      } finally {
        this.guardando.set(false);
        this.progreso.set(null);
        this.cargarPromociones();
      }
    });
  }

  private async crearPromocion(): Promise<void> {
    const { titulo, duracion, orden, activo } = this.promocionModel();
    const archivos = this.items().flatMap((i) => (i.archivo ? [i.archivo] : []));

    await this.conProgreso(
      this.promocionesService.crear({
        titulo: titulo.trim(),
        archivos,
        duracion_segundos: duracion,
        orden,
        activo,
      }),
    );

    this.messageService.add({
      severity: 'success',
      summary: 'Promoción creada',
      detail: `Se agregó la promoción "${titulo.trim()}".`,
    });
  }

  /**
   * Aplica los cambios en pasos: datos, archivos nuevos, archivos quitados y orden final.
   * Se sube primero lo nuevo para que la promoción nunca quede sin archivos.
   */
  private async actualizarPromocion(): Promise<void> {
    const original = this.promocionEditando;
    if (!original) return;

    const { titulo, duracion, orden, activo } = this.promocionModel();
    const datos: ActualizarPromocionRequest = {};

    if (titulo.trim() !== original.titulo) datos.titulo = titulo.trim();
    if (duracion !== original.duracion_segundos) datos.duracion_segundos = duracion;
    if (orden !== original.orden) datos.orden = orden;
    if (activo !== (original.activo === 1)) datos.activo = activo;

    if (Object.keys(datos).length > 0) {
      await firstValueFrom(this.promocionesService.actualizar(original.id, datos));
    }

    const items = this.items();
    const nuevos = items.filter((i) => i.archivo);
    const idsPorClave = new Map<string, number>();
    let idsCreados: number[] = [];

    if (nuevos.length) {
      const respuesta = await this.conProgreso(
        this.promocionesService.agregarArchivos(
          original.id,
          nuevos.map((i) => i.archivo!),
        ),
      );
      idsCreados = (respuesta.data ?? []).map((a) => a.id);
      nuevos.forEach((item, i) => idsPorClave.set(item.clave, idsCreados[i]));
    }

    const idsConservados = new Set(items.flatMap((i) => (i.id ? [i.id] : [])));
    const quitados = original.archivos.filter((a) => !idsConservados.has(a.id));

    for (const archivo of quitados) {
      await firstValueFrom(this.promocionesService.eliminarArchivo(original.id, archivo.id));
    }

    // El servidor deja los existentes en su orden y agrega los nuevos al final
    const ordenServidor = [
      ...original.archivos.filter((a) => idsConservados.has(a.id)).map((a) => a.id),
      ...idsCreados,
    ];
    const ordenDeseado = items.map((i) => i.id ?? idsPorClave.get(i.clave)!);

    if (ordenDeseado.some((id, i) => id !== ordenServidor[i])) {
      await firstValueFrom(this.promocionesService.ordenarArchivos(original.id, ordenDeseado));
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Promoción actualizada',
      detail: `Se actualizó la promoción "${titulo.trim()}".`,
    });
  }

  protected cambiarEstado(promocion: Promocion): void {
    this.cambiandoEstado.set(promocion.id);

    this.promocionesService.actualizar(promocion.id, { activo: promocion.activo !== 1 }).subscribe({
      next: () => {
        this.cambiandoEstado.set(null);
        this.cargarPromociones();
      },
      error: (error: unknown) => {
        this.cambiandoEstado.set(null);
        this.mostrarError(error, 'No se pudo cambiar el estado de la promoción.');
      },
    });
  }

  protected confirmarEliminar(promocion: Promocion): void {
    this.confirmationService.confirm({
      header: 'Eliminar promoción',
      message: `¿Seguro que querés eliminar la promoción "${promocion.titulo}" y todos sus archivos? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminarPromocion(promocion),
    });
  }

  private eliminarPromocion(promocion: Promocion): void {
    this.promocionesService.eliminar(promocion.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Promoción eliminada',
          detail: `Se eliminó la promoción "${promocion.titulo}".`,
        });
        this.cargarPromociones();
      },
      error: (error: unknown) => {
        this.mostrarError(error, 'No se pudo eliminar la promoción.');
      },
    });
  }

  /** Espera la respuesta de una subida actualizando la barra de progreso. */
  private conProgreso<T>(subida: Observable<HttpEvent<ApiResponse<T>>>): Promise<ApiResponse<T>> {
    this.progreso.set(0);

    return lastValueFrom(
      subida.pipe(
        tap((evento) => {
          if (evento.type === HttpEventType.UploadProgress && evento.total) {
            this.progreso.set(Math.round((evento.loaded / evento.total) * 100));
          }
        }),
        filter((evento) => evento.type === HttpEventType.Response),
        map((evento) => evento.body as ApiResponse<T>),
      ),
    );
  }

  private limpiarItems(): void {
    for (const item of this.items()) {
      if (item.archivo) {
        URL.revokeObjectURL(item.url);
      }
    }

    this.items.set([]);
    this.archivoError.set(null);
  }

  private mostrarError(error: unknown, fallback: string, enDialogo = false): void {
    let mensaje = fallback;

    if (error instanceof HttpErrorResponse) {
      if (typeof error.error?.message === 'string') {
        mensaje = error.error.message;
      } else if (error.status === 413) {
        mensaje = 'Los archivos superan el tamaño máximo permitido por el servidor.';
      }
    }

    if (enDialogo) {
      this.errorMensaje.set(mensaje);
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
    }
  }
}
