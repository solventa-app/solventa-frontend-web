export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
};

export type Asegurado = {
  documento: Scalars['String']['output'];
  nombre: Scalars['String']['output'];
};

export type ErrorSiniestro = {
  mensaje: Scalars['String']['output'];
};

export type EstadoPoliza =
  | 'EMITIDA';

export type EstadoSiniestro =
  | 'APROBADO'
  | 'EN_REVISION'
  | 'PENDIENTE'
  | 'RECHAZADO';

export type Evidencia = {
  archivo: Scalars['String']['output'];
  geoetiquetada: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  nota?: Maybe<Scalars['String']['output']>;
  registradaEn: Scalars['DateTime']['output'];
  tipo: TipoEvidencia;
  titulo: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type Monto = {
  moneda: Scalars['String']['output'];
  valor: Scalars['String']['output'];
};

export type MotivoRechazo =
  | 'EVIDENCIA_INSUFICIENTE'
  | 'FUERA_DE_COBERTURA'
  | 'INCONSISTENCIA_EN_RELATO'
  | 'OTRO'
  | 'POLIZA_NO_VIGENTE';

export type Mutation = {
  aprobarSiniestro: ResultadoResolucion;
  derivarSiniestro: ResultadoResolucion;
  rechazarSiniestro: ResultadoResolucion;
};


export type MutationAprobarSiniestroArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDerivarSiniestroArgs = {
  id: Scalars['ID']['input'];
  instrucciones?: InputMaybe<Scalars['String']['input']>;
  peritoId: Scalars['ID']['input'];
};


export type MutationRechazarSiniestroArgs = {
  comentario?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  motivo: MotivoRechazo;
};

export type Perito = {
  ciudad: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  nombre: Scalars['String']['output'];
  red: Scalars['String']['output'];
  registro: Scalars['String']['output'];
  tiempoRespuestaDias: Scalars['Int']['output'];
  vencimientoInforme?: Maybe<Scalars['DateTime']['output']>;
};

export type Poliza = {
  cobertura: Monto;
  estado: EstadoPoliza;
  id: Scalars['ID']['output'];
  numero: Scalars['String']['output'];
  prima: Monto;
  ramo: Scalars['String']['output'];
  vigenciaDesde: Scalars['DateTime']['output'];
  vigenciaHasta: Scalars['DateTime']['output'];
};

export type Query = {
  peritos: Array<Perito>;
  siniestro?: Maybe<Siniestro>;
  siniestros: Array<Siniestro>;
};


export type QueryPeritosArgs = {
  siniestroId: Scalars['ID']['input'];
};


export type QuerySiniestroArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySiniestrosArgs = {
  estado?: InputMaybe<EstadoSiniestro>;
};

export type Resolucion = {
  comentario?: Maybe<Scalars['String']['output']>;
  indemnizacion?: Maybe<Monto>;
  instrucciones?: Maybe<Scalars['String']['output']>;
  metodoTransferencia?: Maybe<Scalars['String']['output']>;
  motivo?: Maybe<MotivoRechazo>;
  notificacion: Scalars['String']['output'];
  perito?: Maybe<Perito>;
  plazoDispersion?: Maybe<Scalars['String']['output']>;
  resueltaEn: Scalars['DateTime']['output'];
  tipo: TipoResolucion;
  vencimientoInforme?: Maybe<Scalars['DateTime']['output']>;
  viaRecurso?: Maybe<Scalars['String']['output']>;
};

export type ResultadoResolucion = ErrorSiniestro | Siniestro;

export type Siniestro = {
  asegurado: Asegurado;
  coberturaAplicada: Scalars['String']['output'];
  descripcion: Scalars['String']['output'];
  entidadAcreedora: Scalars['String']['output'];
  estado: EstadoSiniestro;
  evidencias: Array<Evidencia>;
  id: Scalars['ID']['output'];
  notificadoEn: Scalars['DateTime']['output'];
  ocurridoEn: Scalars['DateTime']['output'];
  poliza: Poliza;
  radicado: Scalars['String']['output'];
  resolucion?: Maybe<Resolucion>;
  sumaReclamada: Monto;
  ubicacion: Ubicacion;
  venceDictamenEn: Scalars['DateTime']['output'];
  verificaciones: Array<Verificacion>;
};

export type TipoEvidencia =
  | 'DOCUMENTO'
  | 'FOTO';

export type TipoResolucion =
  | 'APROBACION'
  | 'DERIVACION'
  | 'RECHAZO';

export type Ubicacion = {
  ciudad: Scalars['String']['output'];
  descripcion: Scalars['String']['output'];
  latitud: Scalars['Float']['output'];
  longitud: Scalars['Float']['output'];
};

export type Verificacion = {
  cumple: Scalars['Boolean']['output'];
  descripcion: Scalars['String']['output'];
};
