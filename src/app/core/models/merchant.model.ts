export interface Merchant {
  id: number;
  usuario: string;
  nombres: string;
  apellidos: string;
  documento: string;
  puesto: string | null;
  activo: 0 | 1;
  creado_el: string;
  modificado_el: string | null;
}

export interface CrearMerchantRequest {
  nombres: string;
  apellidos: string;
  documento: string;
  puesto?: string;
}

export interface CrearMerchantResponse {
  id: number;
  usuario: string;
  clave: string;
  puesto: string | null;
}

export interface ActualizarMerchantRequest {
  nombres?: string;
  apellidos?: string;
  documento?: string;
  puesto?: string;
}

export interface ResetearClaveResponse {
  clave: string;
}
