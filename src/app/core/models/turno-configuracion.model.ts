export interface TurnoConfiguracion {
  id: number;
  fecha: string;
  numero_inicial: number;
  activo: 0 | 1;
  creado_el: string;
  modificado_el: string | null;
}

export interface GuardarTurnoConfiguracionRequest {
  numero_inicial: number;
  fecha?: string;
}

export interface GuardarTurnoConfiguracionResponse {
  id: number;
  fecha: string;
  numero_inicial: number;
  activo: 0 | 1;
}
