import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

import { Auth } from '../../core/services/auth';
import { Boxes } from '../../core/services/boxes';
import { TurnosConfiguracion } from '../../core/services/turnos-configuracion';

@Component({
  selector: 'app-home',
  imports: [SkeletonModule],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  protected readonly authService = inject(Auth);
  private readonly boxesService = inject(Boxes);
  private readonly turnosService = inject(TurnosConfiguracion);

  protected readonly cantidadBoxes = signal<number | null>(null);
  protected readonly numeracionActual = signal<number | null>(null);
  protected readonly cargandoBoxes = signal(true);
  protected readonly cargandoTurnos = signal(true);

  ngOnInit(): void {
    this.boxesService.listar().subscribe({
      next: (r) => {
        this.cantidadBoxes.set(r.data?.length ?? 0);
        this.cargandoBoxes.set(false);
      },
      error: () => {
        this.cantidadBoxes.set(null);
        this.cargandoBoxes.set(false);
      },
    });

    this.turnosService.obtener().subscribe({
      next: (r) => {
        this.numeracionActual.set(r.data?.numero_actual ?? null);
        this.cargandoTurnos.set(false);
      },
      error: () => {
        this.numeracionActual.set(null);
        this.cargandoTurnos.set(false);
      },
    });
  }
}
