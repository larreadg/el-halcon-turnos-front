import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TurnoFinalizado, TurnoLlamando } from '../../../core/models/pantalla-turnos.model';

/** Desde esta cantidad de turnos en atención, el panel se desplaza en loop; con menos, quedan fijos. */
const MINIMO_PARA_DESPLAZAR = 3;
/** Desde esta cantidad de turnos llamados, el carrusel se mueve; con menos, quedan fijos. */
const MINIMO_LLAMADOS_PARA_DESPLAZAR = 3;
const MAXIMO_LLAMADOS = 6;
/** Tarjetas mínimas por vuelta del loop para cubrir el alto (en atención) o el ancho (llamados). */
const MINIMO_POR_VUELTA_ACTUALES = 5;
const MINIMO_POR_VUELTA_LLAMADOS = 4;
const SEGUNDOS_POR_TARJETA = 4;

/**
 * Repite los turnos hasta llenar una vuelta y la duplica, para que el loop
 * (que se desplaza -50%) no deje huecos aunque haya un solo turno.
 */
function armarLoop<T>(items: T[], minimoPorVuelta: number): T[] {
  if (items.length === 0) return [];
  const repeticiones = Math.ceil(minimoPorVuelta / items.length);
  const vuelta = Array.from({ length: repeticiones }, () => items).flat();
  return [...vuelta, ...vuelta];
}

@Component({
  selector: 'app-panel-turnos',
  templateUrl: './panel-turnos.html',
  styleUrl: './panel-turnos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelTurnos {
  readonly llamando = input.required<TurnoLlamando[]>();
  readonly ultimosLlamados = input<TurnoFinalizado[]>([]);
  readonly cargando = input(false);

  protected readonly desplazar = computed(() => this.llamando().length >= MINIMO_PARA_DESPLAZAR);

  protected readonly turnosVisibles = computed(() =>
    this.desplazar() ? armarLoop(this.llamando(), MINIMO_POR_VUELTA_ACTUALES) : this.llamando(),
  );

  protected readonly duracionDesplazamiento = computed(
    () => `${(this.turnosVisibles().length / 2) * SEGUNDOS_POR_TARJETA}s`,
  );

  protected readonly llamados = computed(() => this.ultimosLlamados().slice(0, MAXIMO_LLAMADOS));

  protected readonly desplazarLlamados = computed(
    () => this.llamados().length >= MINIMO_LLAMADOS_PARA_DESPLAZAR,
  );

  protected readonly llamadosVisibles = computed(() =>
    this.desplazarLlamados()
      ? armarLoop(this.llamados(), MINIMO_POR_VUELTA_LLAMADOS)
      : this.llamados(),
  );

  protected readonly duracionLlamados = computed(
    () => `${(this.llamadosVisibles().length / 2) * SEGUNDOS_POR_TARJETA}s`,
  );

  protected etiqueta(turno: TurnoLlamando | TurnoFinalizado): string {
    return turno.puesto ?? `${turno.nombres} ${turno.apellidos}`;
  }
}
