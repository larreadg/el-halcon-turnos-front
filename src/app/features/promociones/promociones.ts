import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { GalleriaModule, GalleriaResponsiveOptions } from 'primeng/galleria';
import { ConfirmationService, MessageService } from 'primeng/api';

import { Promociones as PromocionesService } from '../../core/services/promociones';
import { Promocion, PromocionArchivo } from '../../core/models/promocion.model';

/** Días ISO (1 = lunes ... 7 = domingo), como los guarda el backend. */
export const DIAS_SEMANA = [
  { valor: 1, corto: 'Lun' },
  { valor: 2, corto: 'Mar' },
  { valor: 3, corto: 'Mié' },
  { valor: 4, corto: 'Jue' },
  { valor: 5, corto: 'Vie' },
  { valor: 6, corto: 'Sáb' },
  { valor: 7, corto: 'Dom' },
];

/** Mensaje de éxito que la pantalla de alta/edición deja en el state de la navegación. */
export interface MensajePromociones {
  summary: string;
  detail: string;
}

@Component({
  selector: 'app-promociones',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    GalleriaModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './promociones.html',
  styleUrl: './promociones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Promociones implements OnInit {
  private readonly promocionesService = inject(PromocionesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  protected readonly promociones = signal<Promocion[]>([]);
  protected readonly cargando = signal(false);
  protected readonly cambiandoEstado = signal<number | null>(null);
  /** Promociones marcadas en la tabla para activar/desactivar juntas. */
  protected readonly seleccion = signal<Promocion[]>([]);
  protected readonly cambiandoEstadoSeleccion = signal<'activar' | 'desactivar' | null>(null);

  protected readonly vistaPreviaVisible = signal(false);
  protected readonly promocionVistaPrevia = signal<Promocion | null>(null);
  protected readonly indiceVistaPrevia = signal(0);
  protected readonly archivosVistaPrevia = computed(
    () => this.promocionVistaPrevia()?.archivos ?? [],
  );
  /** Miniaturas visibles en la galería según el ancho de pantalla. */
  protected readonly galeriaResponsive: GalleriaResponsiveOptions[] = [
    { breakpoint: '768px', numVisible: 3 },
    { breakpoint: '560px', numVisible: 2 },
  ];

  ngOnInit(): void {
    this.mostrarMensajeNavegacion();
    this.cargarPromociones();
  }

  /** Muestra el resultado de guardar en /promociones/nuevo o /promociones/:id/editar. */
  private mostrarMensajeNavegacion(): void {
    const mensaje = (history.state as { mensaje?: MensajePromociones } | null)?.mensaje;
    if (!mensaje) return;

    // Se muestra una sola vez aunque se recargue la página
    history.replaceState({ ...history.state, mensaje: undefined }, '');
    // Después del primer render, para que el p-toast ya esté escuchando
    setTimeout(() => this.messageService.add({ severity: 'success', ...mensaje }));
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

  protected resumenDias(promocion: Promocion): string {
    if (!promocion.dias_semana.length) return 'Todos los días';

    return DIAS_SEMANA.filter((d) => promocion.dias_semana.includes(d.valor))
      .map((d) => d.corto)
      .join(', ');
  }

  protected resumenFechas(promocion: Promocion): string | null {
    const { fecha_desde: desde, fecha_hasta: hasta } = promocion;

    if (desde && hasta) return `Del ${this.formatearFecha(desde)} al ${this.formatearFecha(hasta)}`;
    if (desde) return `Desde el ${this.formatearFecha(desde)}`;
    if (hasta) return `Hasta el ${this.formatearFecha(hasta)}`;
    return null;
  }

  /** Si una promoción activa no aparece hoy en la pantalla por sus días de publicación. */
  protected fueraDeFecha(promocion: Promocion): boolean {
    const ahora = new Date();
    const hoy = [
      ahora.getFullYear(),
      String(ahora.getMonth() + 1).padStart(2, '0'),
      String(ahora.getDate()).padStart(2, '0'),
    ].join('-');
    const diaIso = ahora.getDay() || 7;

    return (
      (promocion.fecha_desde !== null && promocion.fecha_desde > hoy) ||
      (promocion.fecha_hasta !== null && promocion.fecha_hasta < hoy) ||
      (promocion.dias_semana.length > 0 && !promocion.dias_semana.includes(diaIso))
    );
  }

  private formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  protected cargarPromociones(): void {
    this.cargando.set(true);

    this.promocionesService.listar().subscribe({
      next: (respuesta) => {
        const promociones = respuesta.data ?? [];
        this.promociones.set(promociones);
        // Conservar la selección de las que siguen existiendo, con sus datos actualizados
        const seleccionados = new Set(this.seleccion().map((p) => p.id));
        this.seleccion.set(promociones.filter((p) => seleccionados.has(p.id)));
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.mostrarError(error, 'No se pudo cargar la lista de promociones.');
      },
    });
  }

  protected abrirVistaPrevia(promocion: Promocion): void {
    this.promocionVistaPrevia.set(promocion);
    this.indiceVistaPrevia.set(0);
    this.vistaPreviaVisible.set(true);
  }

  /** Al cerrar se conserva la promoción para que la animación de salida siga mostrándola. */
  protected onVistaPreviaVisibleChange(visible: boolean): void {
    this.vistaPreviaVisible.set(visible);
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

  protected cambiarEstadoSeleccion(activo: boolean): void {
    const ids = this.seleccion().map((p) => p.id);
    if (!ids.length) return;

    this.cambiandoEstadoSeleccion.set(activo ? 'activar' : 'desactivar');

    this.promocionesService.cambiarEstado(ids, activo).subscribe({
      next: () => {
        this.cambiandoEstadoSeleccion.set(null);
        this.messageService.add({
          severity: 'success',
          summary: activo ? 'Promociones activadas' : 'Promociones desactivadas',
          detail:
            ids.length === 1
              ? `Se ${activo ? 'activó' : 'desactivó'} 1 promoción.`
              : `Se ${activo ? 'activaron' : 'desactivaron'} ${ids.length} promociones.`,
        });
        this.seleccion.set([]);
        this.cargarPromociones();
      },
      error: (error: unknown) => {
        this.cambiandoEstadoSeleccion.set(null);
        this.mostrarError(error, 'No se pudo cambiar el estado de las promociones.');
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

  private mostrarError(error: unknown, fallback: string): void {
    let mensaje = fallback;

    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      mensaje = error.error.message;
    }

    this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
  }
}
