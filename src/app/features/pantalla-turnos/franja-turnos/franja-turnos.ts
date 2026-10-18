import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TurnoLlamando } from '../../../core/models/pantalla-turnos.model';

/** Cantidad de turnos que entran fijos en la franja; con más, se desplazan en loop. */
const MAXIMO_FIJOS = 3;

@Component({
  selector: 'app-franja-turnos',
  templateUrl: './franja-turnos.html',
  styleUrl: './franja-turnos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FranjaTurnos {
  readonly llamando = input.required<TurnoLlamando[]>();
  readonly cargando = input(false);

  protected readonly desplazar = computed(() => this.llamando().length > MAXIMO_FIJOS);

  protected readonly turnosVisibles = computed(() => {
    const items = this.llamando();
    return this.desplazar() ? [...items, ...items] : items;
  });

  protected readonly duracionDesplazamiento = computed(() => `${this.llamando().length * 4}s`);

  protected etiqueta(turno: TurnoLlamando): string {
    return turno.puesto ?? `${turno.nombres} ${turno.apellidos}`;
  }
}
