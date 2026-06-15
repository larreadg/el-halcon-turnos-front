import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CarouselModule } from 'primeng/carousel';

import { environment } from '../../../environments/environment';
import { PantallaTurnosService } from '../../core/services/pantalla-turnos';
import { TurnoFinalizado, TurnoLlamando } from '../../core/models/pantalla-turnos.model';

const INTERVALO_ACTUALIZACION_MS = 10000;
const TICKETS_AUDIO_URL = `${environment.apiUrl.replace(/\/api\/?$/, '')}/storage/tickets`;

@Component({
  selector: 'app-pantalla-turnos',
  imports: [CarouselModule, NgTemplateOutlet],
  templateUrl: './pantalla-turnos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PantallaTurnos implements OnInit {
  private readonly pantallaService = inject(PantallaTurnosService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly llamando = signal<TurnoLlamando[]>([]);
  protected readonly ultimosFinalizados = signal<TurnoFinalizado[]>([]);
  protected readonly cargando = signal(true);

  private readonly idsAnunciados = new Set<number>();
  private readonly colaAnuncios: TurnoLlamando[] = [];
  private primeraCarga = true;
  private anunciandoEnCurso = false;

  ngOnInit(): void {
    this.actualizar();

    const intervalo = setInterval(() => this.actualizar(), INTERVALO_ACTUALIZACION_MS);
    this.destroyRef.onDestroy(() => clearInterval(intervalo));
  }

  protected etiqueta(turno: TurnoLlamando | TurnoFinalizado): string {
    return turno.puesto ?? `${turno.nombres} ${turno.apellidos}`;
  }

  private actualizar(): void {
    this.pantallaService.obtener().subscribe({
      next: (respuesta) => {
        const llamando = respuesta.data?.llamando ?? [];

        if (this.primeraCarga) {
          this.primeraCarga = false;
        } else {
          for (const turno of llamando) {
            if (!this.idsAnunciados.has(turno.id)) {
              this.anunciar(turno);
            }
          }
        }

        for (const turno of llamando) {
          this.idsAnunciados.add(turno.id);
        }

        this.llamando.set(llamando);
        this.ultimosFinalizados.set(respuesta.data?.ultimos_finalizados ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      },
    });
  }

  private anunciar(turno: TurnoLlamando): void {
    this.colaAnuncios.push(turno);
    this.procesarColaAnuncios();
  }

  private procesarColaAnuncios(): void {
    if (this.anunciandoEnCurso) {
      return;
    }

    const turno = this.colaAnuncios.shift();
    if (!turno) {
      return;
    }

    this.anunciandoEnCurso = true;

    const continuar = () => {
      this.anunciandoEnCurso = false;
      this.procesarColaAnuncios();
    };

    let campanaResuelta = false;
    const reproducirTicket = () => {
      if (campanaResuelta) {
        return;
      }
      campanaResuelta = true;

      this.reproducirAudioTicket(turno, continuar);
    };

    if (typeof Audio === 'undefined') {
      reproducirTicket();
      return;
    }

    const campana = new Audio('/bell.mp3');
    campana.addEventListener('ended', reproducirTicket, { once: true });
    campana.addEventListener('error', reproducirTicket, { once: true });
    campana.play().catch(reproducirTicket);
  }

  private reproducirAudioTicket(turno: TurnoLlamando, continuar: () => void): void {
    if (typeof Audio === 'undefined') {
      this.anunciarConVoz(turno, continuar);
      return;
    }

    let ticketResuelto = false;
    const usarVoz = () => {
      if (ticketResuelto) {
        return;
      }
      ticketResuelto = true;

      this.anunciarConVoz(turno, continuar);
    };

    const audioTicket = new Audio(`${TICKETS_AUDIO_URL}/t_${turno.numero}.mp3`);
    audioTicket.addEventListener(
      'ended',
      () => {
        if (!ticketResuelto) {
          ticketResuelto = true;
          continuar();
        }
      },
      { once: true },
    );
    audioTicket.addEventListener('error', usarVoz, { once: true });
    audioTicket.play().catch(usarVoz);
  }

  private anunciarConVoz(turno: TurnoLlamando, continuar: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      continuar();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      `Ticket ${turno.numero}. ${this.etiqueta(turno)}`,
    );
    utterance.lang = 'es-PY';
    utterance.onend = continuar;
    utterance.onerror = continuar;

    window.speechSynthesis.speak(utterance);
  }
}
