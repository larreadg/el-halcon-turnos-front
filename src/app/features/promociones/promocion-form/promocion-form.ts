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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, filter, firstValueFrom, lastValueFrom, map, tap } from 'rxjs';
import {
  FormField,
  form,
  max,
  maxLength,
  min,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { Promociones as PromocionesService } from '../../../core/services/promociones';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  ActualizarPromocionRequest,
  Promocion,
  TipoPromocion,
} from '../../../core/models/promocion.model';
import { DIAS_SEMANA, MensajePromociones } from '../promociones';

/** Archivo en la lista del formulario: uno ya guardado (id) o uno nuevo por subir (archivo). */
interface ItemArchivo {
  clave: string;
  tipo: TipoPromocion;
  url: string;
  nombre: string;
  id?: number;
  archivo?: File;
}

/** Máximo por archivo al subirlo (debe coincidir con el backend). */
const TAMANO_MAXIMO_MB = 15;
/** Las imágenes se guardan comprimidas a WEBP de hasta este tamaño (lo hace el backend). */
const TAMANO_MAXIMO_IMAGEN_GUARDADA_MB = 2;
const MAXIMO_ARCHIVOS_POR_SUBIDA = 20;
/** Tamaño exacto del área del carrusel en la pantalla de turnos (debe coincidir con el backend). */
const ANCHO_REQUERIDO = 1200;
const ALTO_REQUERIDO = 1080;
const MIMES_PERMITIDOS: Record<string, TipoPromocion> = {
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/webp': 'imagen',
  'video/mp4': 'video',
  'video/webm': 'video',
};

/** Pantalla de alta (/promociones/nuevo) y edición (/promociones/:id/editar) de una promoción. */
@Component({
  selector: 'app-promocion-form',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    FormField,
    ButtonModule,
    InputTextModule,
    MessageModule,
    ToggleSwitchModule,
    ProgressBarModule,
    SelectButtonModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './promocion-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromocionForm implements OnInit {
  private readonly promocionesService = inject(PromocionesService);
  private readonly router = inject(Router);

  /** Parámetro de ruta; sin id se crea una promoción nueva. */
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly acceptArchivos = Object.keys(MIMES_PERMITIDOS).join(',');
  protected readonly tamanoMaximoMb = TAMANO_MAXIMO_MB;
  protected readonly tamanoMaximoImagenMb = TAMANO_MAXIMO_IMAGEN_GUARDADA_MB;
  protected readonly tamanoRequerido = `${ANCHO_REQUERIDO} × ${ALTO_REQUERIDO} px`;
  protected readonly diasSemana = DIAS_SEMANA;

  protected readonly editando = this.id !== null;
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly progreso = signal<number | null>(null);
  protected readonly errorMensaje = signal<string | null>(null);
  /** Error al cargar los datos iniciales: en ese caso no se muestra el formulario. */
  protected readonly errorCarga = signal<string | null>(null);

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
    fechaDesde: '',
    fechaHasta: '',
    dias: [] as number[],
  });

  protected readonly promocionForm = form(this.promocionModel, (schema) => {
    validate(schema.fechaHasta, ({ value, valueOf }) => {
      const desde = valueOf(schema.fechaDesde);
      return desde && value() && value() < desde
        ? { kind: 'rango', message: 'La fecha hasta no puede ser anterior a la fecha desde' }
        : null;
    });
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
    this.cargar();
  }

  private cargar(): void {
    if (this.editando) {
      this.cargarPromocion(Number(this.id));
    } else {
      this.cargarSiguienteOrden();
    }
  }

  /** Al crear, el orden propuesto es el siguiente al mayor de las promociones existentes. */
  private cargarSiguienteOrden(): void {
    this.promocionesService.listar().subscribe({
      next: (respuesta) => {
        const siguienteOrden = (respuesta.data ?? []).reduce(
          (maximo, p) => Math.max(maximo, p.orden + 1),
          0,
        );
        this.promocionModel.update((m) => ({ ...m, orden: siguienteOrden }));
        this.cargando.set(false);
      },
      // Sin el listado se puede crear igual, con el orden por defecto
      error: () => this.cargando.set(false),
    });
  }

  private cargarPromocion(id: number): void {
    this.promocionesService.obtener(id).subscribe({
      next: (respuesta) => {
        const promocion = respuesta.data;
        this.cargando.set(false);

        if (!promocion) {
          this.errorCarga.set('La promoción no existe o fue eliminada.');
          return;
        }

        this.promocionEditando = promocion;
        this.items.set(
          promocion.archivos.map((archivo, i) => ({
            clave: `existente-${archivo.id}`,
            tipo: archivo.tipo,
            url: this.promocionesService.urlArchivo(archivo.id),
            nombre: `Archivo ${i + 1}`,
            id: archivo.id,
          })),
        );
        this.promocionModel.set({
          titulo: promocion.titulo,
          duracion: promocion.duracion_segundos,
          orden: promocion.orden,
          activo: promocion.activo === 1,
          fechaDesde: promocion.fecha_desde ?? '',
          fechaHasta: promocion.fecha_hasta ?? '',
          dias: [...promocion.dias_semana],
        });
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeError(error, 'No se pudo cargar la promoción.'));
      },
    });
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
        const mensaje = this.editando
          ? await this.actualizarPromocion()
          : await this.crearPromocion();
        this.volver(mensaje);
      } catch (error) {
        this.errorMensaje.set(this.mensajeError(error, 'No se pudo guardar la promoción.'));
      } finally {
        this.guardando.set(false);
        this.progreso.set(null);
      }
    });
  }

  /** Vuelve al listado; el mensaje se muestra allá como toast. */
  private volver(mensaje: MensajePromociones): void {
    this.router.navigate(['/promociones'], { state: { mensaje } });
  }

  private async crearPromocion(): Promise<MensajePromociones> {
    const { titulo, duracion, orden, activo, fechaDesde, fechaHasta, dias } = this.promocionModel();
    const archivos = this.items().flatMap((i) => (i.archivo ? [i.archivo] : []));

    await this.conProgreso(
      this.promocionesService.crear({
        titulo: titulo.trim(),
        archivos,
        duracion_segundos: duracion,
        orden,
        activo,
        fecha_desde: fechaDesde || null,
        fecha_hasta: fechaHasta || null,
        dias_semana: this.normalizarDias(dias),
      }),
    );

    return {
      summary: 'Promoción creada',
      detail: `Se agregó la promoción "${titulo.trim()}".`,
    };
  }

  /**
   * Aplica los cambios en pasos: datos, archivos nuevos, archivos quitados y orden final.
   * Se sube primero lo nuevo para que la promoción nunca quede sin archivos.
   */
  private async actualizarPromocion(): Promise<MensajePromociones> {
    const original = this.promocionEditando!;
    const { titulo, duracion, orden, activo, fechaDesde, fechaHasta, dias } = this.promocionModel();
    const datos: ActualizarPromocionRequest = {};
    const diasSemana = this.normalizarDias(dias);

    if (titulo.trim() !== original.titulo) datos.titulo = titulo.trim();
    if (duracion !== original.duracion_segundos) datos.duracion_segundos = duracion;
    if (orden !== original.orden) datos.orden = orden;
    if (activo !== (original.activo === 1)) datos.activo = activo;
    // Las fechas viajan juntas para que el backend valide el rango completo
    if (
      (fechaDesde || null) !== original.fecha_desde ||
      (fechaHasta || null) !== original.fecha_hasta
    ) {
      datos.fecha_desde = fechaDesde || null;
      datos.fecha_hasta = fechaHasta || null;
    }
    if (diasSemana.join(',') !== original.dias_semana.join(',')) datos.dias_semana = diasSemana;

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

    return {
      summary: 'Promoción actualizada',
      detail: `Se actualizó la promoción "${titulo.trim()}".`,
    };
  }

  /** Días ordenados; con los 7 elegidos equivale a "todos los días" (lista vacía), como en el backend. */
  private normalizarDias(dias: number[]): number[] {
    const ordenados = [...new Set(dias)].sort((a, b) => a - b);
    return ordenados.length === DIAS_SEMANA.length ? [] : ordenados;
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

  private mensajeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error?.message === 'string') {
        return error.error.message;
      }
      if (error.status === 413) {
        return 'Los archivos superan el tamaño máximo permitido por el servidor.';
      }
    }

    return fallback;
  }
}
