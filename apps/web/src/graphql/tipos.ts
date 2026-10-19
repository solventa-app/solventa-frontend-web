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

export type ClienteCobro = {
  id: Scalars['ID']['output'];
  nombre?: Maybe<Scalars['String']['output']>;
};

export type Cobro = {
  actualizadoEn: Scalars['DateTime']['output'];
  cliente?: Maybe<ClienteCobro>;
  estado: EstadoCobro;
  id: Scalars['ID']['output'];
  idTransaccion?: Maybe<Scalars['String']['output']>;
  intentos?: Maybe<Scalars['Int']['output']>;
  monto: Monto;
  motivo?: Maybe<Scalars['String']['output']>;
  polizaId: Scalars['ID']['output'];
  reintentosRestantes?: Maybe<Scalars['Int']['output']>;
};

export type ConfirmacionContacto = {
  canal: CanalContacto;
  resumen: Scalars['String']['output'];
};

export type Consentimiento = {
  estado: EstadoConsentimiento;
  finalidad: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  otorgadoEn: Scalars['DateTime']['output'];
  revocadoEn?: Maybe<Scalars['DateTime']['output']>;
  venceEn: Scalars['DateTime']['output'];
  versionTexto: Scalars['String']['output'];
  vigente: Scalars['Boolean']['output'];
};

export type ConsentimientoInput = {
  canal?: InputMaybe<Scalars['String']['input']>;
  documentoIdentidad?: InputMaybe<Scalars['String']['input']>;
  finalidad: Scalars['String']['input'];
  fuenteDatos?: InputMaybe<Scalars['String']['input']>;
  tipoDato?: InputMaybe<Scalars['String']['input']>;
  versionTexto: Scalars['String']['input'];
};

export type CrearCobroInput = {
  clienteId?: InputMaybe<Scalars['ID']['input']>;
  idIntentoCobro: Scalars['ID']['input'];
  monto: MontoInput;
  polizaId: Scalars['ID']['input'];
  tokenMedioPago: Scalars['String']['input'];
};

export type CrearUsuarioInput = {
  clave: Scalars['String']['input'];
  nombre?: InputMaybe<Scalars['String']['input']>;
  rol: RolUsuario;
  usuario: Scalars['String']['input'];
};

export type CredencialesInput = {
  clave: Scalars['String']['input'];
  usuario: Scalars['String']['input'];
};

export type ErrorAutenticacion = {
  mensaje: Scalars['String']['output'];
};

export type ErrorCobro = {
  mensaje: Scalars['String']['output'];
};

export type ErrorOferta = {
  mensaje: Scalars['String']['output'];
  motivo?: Maybe<MotivoErrorOferta>;
  puedeReintentar: Scalars['Boolean']['output'];
};

export type ErrorUsuario = {
  mensaje: Scalars['String']['output'];
};

export type EstadoCobro =
  | 'COBRADO'
  | 'COBRANDO'
  | 'PENDIENTE'
  | 'RECHAZADO';

export type EstadoConsentimiento =
  | 'REVOCADO'
  | 'VENCIDO'
  | 'VIGENTE';

export type EstadoFuente =
  | 'CACHE'
  | 'FALLO'
  | 'OK';

export type EstadoUsuario =
  | 'ACTIVO'
  | 'SUSPENDIDO';

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

export type MontoInput = {
  moneda: Scalars['String']['input'];
  valor: Scalars['String']['input'];
};

export type MotivoErrorOferta =
  | 'CONSENTIMIENTO_NO_VIGENTE'
  | 'DATOS_INSUFICIENTES'
  | 'FUENTES_NO_DISPONIBLES';

export type Mutation = {
  cambiarRolUsuario: ResultadoUsuario;
  contactarAsesor: ConfirmacionContacto;
  crearCobro: ResultadoCobro;
  crearUsuario: ResultadoUsuario;
  iniciarSesion: ResultadoSesion;
  registrarConsentimiento: Consentimiento;
  reintentarCobro: Cobro;
  revocarConsentimiento: Consentimiento;
  solicitarOferta: ResultadoOferta;
  suspenderUsuario: ResultadoUsuario;
};


export type MutationCambiarRolUsuarioArgs = {
  id: Scalars['ID']['input'];
  rol: RolUsuario;
};


export type MutationContactarAsesorArgs = {
  canal: CanalContacto;
  ofertaId: Scalars['ID']['input'];
};


export type MutationCrearCobroArgs = {
  entrada: CrearCobroInput;
};


export type MutationCrearUsuarioArgs = {
  entrada: CrearUsuarioInput;
};


export type MutationIniciarSesionArgs = {
  entrada: CredencialesInput;
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


export type MutationSuspenderUsuarioArgs = {
  id: Scalars['ID']['input'];
};

export type NivelRiesgo =
  | 'ALTO'
  | 'BAJO'
  | 'MEDIO';

export type Oferta = {
  cobertura: Monto;
  desgloseScore: Array<FactorScore>;
  fuentes: Array<FuenteConsultada>;
  id: Scalars['ID']['output'];
  perfilRiesgo?: Maybe<PerfilRiesgo>;
  prima?: Maybe<Monto>;
  rangoPrima?: Maybe<RangoPrima>;
  tipo: TipoOferta;
};

export type OrigenFuente =
  | 'OPEN_DATA'
  | 'OPEN_FINANCE';

export type PerfilRiesgo = {
  fechaVigencia: Scalars['DateTime']['output'];
  nivelRiesgo: NivelRiesgo;
  score: Scalars['Int']['output'];
};

export type Query = {
  cobros: Array<Cobro>;
  oferta?: Maybe<Oferta>;
  usuarios: Array<Usuario>;
  yo?: Maybe<Usuario>;
};


export type QueryCobrosArgs = {
  estado?: InputMaybe<EstadoCobro>;
  pagina?: InputMaybe<Scalars['Int']['input']>;
  polizaId?: InputMaybe<Scalars['ID']['input']>;
  tamano?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOfertaArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsuariosArgs = {
  rol?: InputMaybe<RolUsuario>;
};

export type RangoPrima = {
  maxima: Monto;
  minima: Monto;
};

export type ResultadoCobro = Cobro | ErrorCobro;

export type ResultadoOferta = ErrorOferta | Oferta;

export type ResultadoSesion = ErrorAutenticacion | Sesion;

export type ResultadoUsuario = ErrorUsuario | Usuario;

export type RolUsuario =
  | 'ASESOR'
  | 'BACKOFFICE'
  | 'CLIENTE';

export type Sesion = {
  expiraEn: Scalars['DateTime']['output'];
  token: Scalars['String']['output'];
  usuario: Usuario;
};

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

export type Usuario = {
  creadoEn: Scalars['DateTime']['output'];
  estado: EstadoUsuario;
  id: Scalars['ID']['output'];
  nombre?: Maybe<Scalars['String']['output']>;
  rol: RolUsuario;
  usuario: Scalars['String']['output'];
};
