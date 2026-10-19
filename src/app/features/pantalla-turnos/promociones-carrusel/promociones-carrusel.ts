import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import { Promociones } from '../../../core/services/promociones';
import { PromocionArchivo, PromocionPantalla } from '../../../core/models/promocion.model';

/** Debe coincidir con la duración del fundido en el SCSS. */
const DURACION_TRANSICION_MS = 1500;

/** Cada archivo de cada promoción es un paso del carrusel. */
interface Paso {
  clave: string;
  promocionIndice: number;
  titulo: string;
  duracionSegundos: number;
  archivo: PromocionArchivo;
}

/** Un paso en pantalla. Durante el fundido conviven la diapositiva saliente y la entrante. */
interface Diapositiva {
  clave: number;
  paso: Paso;
  saliendo: boolean;
  animarEntrada: boolean;
}

@Component({
  selector: 'app-promociones-carrusel',
  templateUrl: './promociones-carrusel.html',
  styleUrl: './promociones-carrusel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromocionesCarrusel {
  private readonly promocionesService = inject(Promociones);

  readonly promociones = input.required<PromocionPantalla[]>();

  protected readonly pasos = computed<Paso[]>(() =>
    this.promociones().flatMap((promocion, promocionIndice) =>
      promocion.archivos.map((archivo) => ({
        clave: `${promocion.id}-${archivo.id}`,
        promocionIndice,
        titulo: promocion.titulo,
        duracionSegundos: promocion.duracion_segundos,
        archivo,
      })),
    ),
  );

  protected readonly indice = signal(0);
  protected readonly diapositivas = signal<Diapositiva[]>([]);
  protected readonly unico = computed(() => this.pasos().length === 1);

  /** Promoción del paso actual, para resaltar su indicador. */
  protected readonly promocionActual = computed(
    () => this.pasos()[this.indice()]?.promocionIndice ?? 0,
  );

  private contador = 0;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private readonly limpiezas = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    // Si la lista se actualiza, mantener el paso actual si sigue existiendo
    effect(() => {
      const pasos = this.pasos();
      untracked(() => this.sincronizar(pasos));
    });

    inject(DestroyRef).onDestroy(() => {
      this.cancelarTemporizador();
      this.limpiezas.forEach((id) => clearTimeout(id));
    });
  }

  protected url(paso: Paso): string {
    return this.promocionesService.urlArchivo(paso.archivo.id);
  }

  protected alTerminarVideo(diapositiva: Diapositiva): void {
    if (!diapositiva.saliendo) {
      this.siguiente();
    }
  }

  protected siguiente(): void {
    const pasos = this.pasos();
    if (pasos.length === 0) return;

    const nuevoIndice = (this.indice() + 1) % pasos.length;
    this.indice.set(nuevoIndice);
    this.mostrar(pasos[nuevoIndice], true);
  }

  private sincronizar(pasos: Paso[]): void {
    if (pasos.length === 0) {
      this.cancelarTemporizador();
      this.diapositivas.set([]);
      return;
    }

    const actual = this.diapositivaActual();
    const posicion = actual ? pasos.findIndex((p) => p.clave === actual.paso.clave) : -1;

    if (posicion >= 0) {
      this.indice.set(posicion);
      if (!this.temporizador) {
        this.programar(pasos[posicion]);
      }
      return;
    }

    this.indice.set(0);
    this.mostrar(pasos[0], actual !== null);
  }

  private mostrar(paso: Paso, animarEntrada: boolean): void {
    const clave = ++this.contador;

    this.diapositivas.update((actuales) => [
      ...actuales.map((d) => ({ ...d, saliendo: true })),
      { clave, paso, saliendo: false, animarEntrada },
    ]);

    // Quitar las diapositivas salientes cuando termina el fundido
    const limpieza = setTimeout(() => {
      this.limpiezas.delete(limpieza);
      this.diapositivas.update((actuales) => actuales.filter((d) => d.clave >= clave));
    }, DURACION_TRANSICION_MS);
    this.limpiezas.add(limpieza);

    this.programar(paso);
  }

  /** Las imágenes avanzan por tiempo; los videos avanzan al terminar (evento ended). */
  private programar(paso: Paso): void {
    this.cancelarTemporizador();

    if (paso.archivo.tipo !== 'imagen' || this.unico()) return;

    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      this.siguiente();
    }, paso.duracionSegundos * 1000);
  }

  private diapositivaActual(): Diapositiva | null {
    return this.diapositivas().find((d) => !d.saliendo) ?? null;
  }

  private cancelarTemporizador(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}
