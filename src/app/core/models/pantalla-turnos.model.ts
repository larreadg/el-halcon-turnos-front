export interface TurnoLlamando {
  id: number;
  numero: number;
  llamado_el: string;
  nombres: string;
  apellidos: string;
  puesto: string | null;
}

export interface TurnoFinalizado {
  id: number;
  numero: number;
  finalizado_el: string;
  nombres: string;
  apellidos: string;
  puesto: string | null;
}

export interface PantallaTurnos {
  llamando: TurnoLlamando[];
  ultimos_finalizados: TurnoFinalizado[];
}
