export interface TurnoLlamando {
  id: number;
  numero: number;
  llamado_el: string;
  nombres: string;
  apellidos: string;
  puesto: string | null;
  box_numero: number | null;
}

export interface TurnoFinalizado {
  id: number;
  numero: number;
  finalizado_el: string;
  nombres: string;
  apellidos: string;
  puesto: string | null;
  box_numero: number | null;
}

export interface PantallaTurnos {
  llamando: TurnoLlamando[];
  ultimos_finalizados: TurnoFinalizado[];
  llamarNuevamente: TurnoLlamando[];
}
