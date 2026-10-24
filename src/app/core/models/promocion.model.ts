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
  /** Rango de publicación (YYYY-MM-DD, inclusive); null = sin límite. */
  fecha_desde: string | null;
  fecha_hasta: string | null;
  /** Días ISO en que se publica (1 = lunes ... 7 = domingo); vacío = todos los días. */
  dias_semana: number[];
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
  fecha_desde: string | null;
  fecha_hasta: string | null;
  dias_semana: number[];
}

export interface ActualizarPromocionRequest {
  titulo?: string;
  duracion_segundos?: number;
  orden?: number;
  activo?: boolean;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  dias_semana?: number[];
}
