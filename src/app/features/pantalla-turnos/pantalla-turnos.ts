import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { environment } from '../../../environments/environment';
import { PantallaTurnosService } from '../../core/services/pantalla-turnos';
import { TurnoLlamando } from '../../core/models/pantalla-turnos.model';

const INTERVALO_ACTUALIZACION_MS = 10000;
const TICKETS_AUDIO_URL = `${environment.apiUrl.replace(/\/api\/?$/, '')}/storage/tickets`;
const BOXES_AUDIO_URL = `${environment.apiUrl.replace(/\/api\/?$/, '')}/storage/boxes`;

@Component({
  selector: 'app-pantalla-turnos',
  imports: [NgTemplateOutlet],
  templateUrl: './pantalla-turnos.html',
  styleUrl: './pantalla-turnos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PantallaTurnos implements OnInit {
  private readonly pantallaService = inject(PantallaTurnosService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly llamando = signal<TurnoLlamando[]>([]);
  protected readonly cargando = signal(true);
  protected readonly turnoAnunciado = signal<TurnoLlamando | null>(null);

  protected readonly llamandoCarousel = computed(() => {
    const items = this.llamando();
    return items.length > 1 ? [...items, ...items] : items;
  });

  protected readonly llamandoCarouselDuration = computed(() =>
    `${this.llamando().length * 6}s`,
  );

  private idsEnLlamando = new Set<number>();
  private readonly colaAnuncios: TurnoLlamando[] = [];
  private primeraCarga = true;
  private anunciandoEnCurso = false;

  ngOnInit(): void {
    this.actualizar();

    const intervalo = setInterval(() => this.actualizar(), INTERVALO_ACTUALIZACION_MS);
    this.destroyRef.onDestroy(() => clearInterval(intervalo));
  }

  protected etiqueta(turno: TurnoLlamando): string {
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
            if (!this.idsEnLlamando.has(turno.id)) {
              this.anunciar(turno);
            }
          }
        }

        this.idsEnLlamando = new Set(llamando.map((t) => t.id));

        for (const turno of respuesta.data?.llamarNuevamente ?? []) {
          this.anunciar(turno);
        }

        this.llamando.set(llamando);
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
    this.turnoAnunciado.set(turno);

    const continuar = () => {
      this.anunciandoEnCurso = false;
      this.turnoAnunciado.set(null);
      this.procesarColaAnuncios();
    };

    this.reproducirAudioTicket(turno, () => this.reproducirAudioBox(turno, continuar));
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

  private reproducirAudioBox(turno: TurnoLlamando, continuar: () => void): void {
    if (!turno.box_numero || typeof Audio === 'undefined') {
      continuar();
      return;
    }

    let resuelto = false;
    const resolver = () => {
      if (resuelto) return;
      resuelto = true;
      continuar();
    };

    const audioBox = new Audio(`${BOXES_AUDIO_URL}/box_${turno.box_numero}.mp3`);
    audioBox.addEventListener('ended', resolver, { once: true });
    audioBox.addEventListener('error', resolver, { once: true });
    audioBox.play().catch(resolver);
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
