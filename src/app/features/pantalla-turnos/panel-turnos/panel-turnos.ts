import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TurnoFinalizado, TurnoLlamando } from '../../../core/models/pantalla-turnos.model';

/** Turnos en atención que entran fijos en el panel; con más, se desplazan en loop. */
const MAXIMO_FIJOS = 3;
const MAXIMO_LLAMADOS = 6;

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

  protected readonly desplazar = computed(() => this.llamando().length > MAXIMO_FIJOS);

  protected readonly turnosVisibles = computed(() => {
    const items = this.llamando();
    return this.desplazar() ? [...items, ...items] : items;
  });

  protected readonly duracionDesplazamiento = computed(() => `${this.llamando().length * 4}s`);

  protected readonly llamados = computed(() => this.ultimosLlamados().slice(0, MAXIMO_LLAMADOS));

  protected etiqueta(turno: TurnoLlamando | TurnoFinalizado): string {
    return turno.puesto ?? `${turno.nombres} ${turno.apellidos}`;
  }
}
