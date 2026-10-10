export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * Contrato GraphQL del BFF (v0, Sprint 1: HU-W01 y HU-W05).
   *
   * Este archivo es la FUENTE DE VERDAD del contrato con `solventa-frontend`.
   * Reglas (ver contracts/README.md): solo cambios ADITIVOS; para quitar algo se marca @deprecated
   * y se retira un sprint después; todo cambio se anota en contracts/CHANGELOG.md.
   */
  DateTime: { input: string; output: string; }
};

export type CanalContacto =
  | 'AGENDAR'
  | 'CHAT'
  | 'LLAMAR';

export type Cobro = {
  actualizadoEn: Scalars['DateTime']['output'];
  cliente: Scalars['String']['output'];
  estado: EstadoCobro;
  id: Scalars['ID']['output'];
  idTransaccion?: Maybe<Scalars['String']['output']>;
  monto: Monto;
  polizaId: Scalars['ID']['output'];
};

export type ConfirmacionContacto = {
  canal: CanalContacto;
  resumen: Scalars['String']['output'];
};

export type Consentimiento = {
  finalidad: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  otorgadoEn: Scalars['DateTime']['output'];
  revocadoEn?: Maybe<Scalars['DateTime']['output']>;
  versionTexto: Scalars['String']['output'];
  vigente: Scalars['Boolean']['output'];
};

export type ConsentimientoInput = {
  finalidad: Scalars['String']['input'];
  versionTexto: Scalars['String']['input'];
};

export type ErrorOferta = {
  mensaje: Scalars['String']['output'];
  puedeReintentar: Scalars['Boolean']['output'];
};

export type EstadoCobro =
  | 'COBRADO'
  | 'COBRANDO'
  | 'PENDIENTE'
  | 'RECHAZADO';

export type EstadoFuente =
  | 'CACHE'
  | 'FALLO'
  | 'OK';

export type FactorScore = {
  nombre: Scalars['String']['output'];
  peso: Scalars['Float']['output'];
};

export type FuenteConsultada = {
  capturadoEn?: Maybe<Scalars['DateTime']['output']>;
  estado: EstadoFuente;
  id: Scalars['ID']['output'];
  nombre: Scalars['String']['output'];
  origen: OrigenFuente;
};

export type Monto = {
  moneda: Scalars['String']['output'];
  valor: Scalars['String']['output'];
};

export type Mutation = {
  contactarAsesor: ConfirmacionContacto;
  registrarConsentimiento: Consentimiento;
  reintentarCobro: Cobro;
  revocarConsentimiento: Consentimiento;
  solicitarOferta: ResultadoOferta;
};


export type MutationContactarAsesorArgs = {
  canal: CanalContacto;
  ofertaId: Scalars['ID']['input'];
};


export type MutationRegistrarConsentimientoArgs = {
  entrada: ConsentimientoInput;
};


export type MutationReintentarCobroArgs = {
  cobroId: Scalars['ID']['input'];
};


export type MutationRevocarConsentimientoArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSolicitarOfertaArgs = {
  entrada: SolicitudOfertaInput;
};

export type Oferta = {
  cobertura: Monto;
  desgloseScore: Array<FactorScore>;
  fuentes: Array<FuenteConsultada>;
  id: Scalars['ID']['output'];
  prima?: Maybe<Monto>;
  rangoPrima?: Maybe<RangoPrima>;
  tipo: TipoOferta;
};

export type OrigenFuente =
  | 'OPEN_DATA'
  | 'OPEN_FINANCE';

export type Query = {
  cobros: Array<Cobro>;
  oferta?: Maybe<Oferta>;
};


export type QueryCobrosArgs = {
  estado?: InputMaybe<EstadoCobro>;
};


export type QueryOfertaArgs = {
  id: Scalars['ID']['input'];
};

export type RangoPrima = {
  maxima: Monto;
  minima: Monto;
};

export type ResultadoOferta = ErrorOferta | Oferta;

export type SolicitudOfertaInput = {
  consentimientoId: Scalars['ID']['input'];
  direccionInmueble: Scalars['String']['input'];
  documentoIdentidad: Scalars['String']['input'];
  plazoMeses: Scalars['Int']['input'];
  valorCredito: Scalars['String']['input'];
};

export type TipoOferta =
  | 'COMPLETA'
  | 'PRELIMINAR';
