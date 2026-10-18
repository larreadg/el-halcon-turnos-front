export type TipoPromocion = 'imagen' | 'video';

export interface PromocionArchivo {
  id: number;
  tipo: TipoPromocion;
  mime: string;
  orden: number;
}

export interface Promocion {
  id: number;
  titulo: string;
  duracion_segundos: number;
  orden: number;
  activo: 0 | 1;
  creado_el: string;
  modificado_el: string | null;
  archivos: PromocionArchivo[];
}

export type PromocionPantalla = Pick<
  Promocion,
  'id' | 'titulo' | 'duracion_segundos' | 'orden' | 'archivos'
>;

export interface CrearPromocionRequest {
  titulo: string;
  archivos: File[];
  duracion_segundos: number;
  orden: number;
  activo: boolean;
}

export interface ActualizarPromocionRequest {
  titulo?: string;
  duracion_segundos?: number;
  orden?: number;
  activo?: boolean;
}
