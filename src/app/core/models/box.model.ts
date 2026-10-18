export interface Box {
  id: number;
  usuario: string;
  puesto: string;
  activo: 0 | 1;
  creado_el: string;
  modificado_el: string | null;
}

export interface CrearBoxRequest {
  puesto: string;
}

export interface CrearBoxResponse {
  id: number;
  usuario: string;
  clave: string;
  puesto: string;
}

export interface ActualizarBoxRequest {
  puesto?: string | null;
}

export interface ResetearClaveBoxResponse {
  clave: string;
}
