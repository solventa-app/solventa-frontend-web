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

export type AccionSugerida =
  | 'CONTACTAR_ASESOR'
  | 'ESPERAR';

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
  medio?: Maybe<MedioPago>;
  monto: Monto;
  motivo?: Maybe<Scalars['String']['output']>;
  origen?: Maybe<OrigenCobro>;
  polizaId: Scalars['ID']['output'];
  reintentosRestantes?: Maybe<Scalars['Int']['output']>;
};

export type CodigoEnviado = {
  correoEnmascarado: Scalars['String']['output'];
  propuestaId: Scalars['ID']['output'];
  venceEn: Scalars['DateTime']['output'];
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

export type ContactoInput = {
  correo?: InputMaybe<Scalars['String']['input']>;
  telefono?: InputMaybe<Scalars['String']['input']>;
};

export type ContactoTitularInput = {
  correo: Scalars['String']['input'];
  nombre: Scalars['String']['input'];
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
  correo?: InputMaybe<Scalars['String']['input']>;
  documentoIdentidad?: InputMaybe<Scalars['String']['input']>;
  nombre?: InputMaybe<Scalars['String']['input']>;
  rol: RolUsuario;
  telefono?: InputMaybe<Scalars['String']['input']>;
  usuario: Scalars['String']['input'];
};

export type CredencialesInput = {
  clave: Scalars['String']['input'];
  usuario: Scalars['String']['input'];
};

export type DocumentoFirma = {
  formaCobro: Scalars['String']['output'];
  meses: Scalars['Int']['output'];
  montoMensual: Monto;
  propuestaId: Scalars['ID']['output'];
  resumen: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type EnlaceEnviado = {
  correoEnmascarado: Scalars['String']['output'];
  propuesta: Propuesta;
  venceEn: Scalars['DateTime']['output'];
};

export type EnlaceFirma = {
  documento?: Maybe<DocumentoFirma>;
  documentoUrl?: Maybe<Scalars['String']['output']>;
  firma?: Maybe<FirmaRegistrada>;
  poliza?: Maybe<Poliza>;
  propuesta: Propuesta;
  venceEn: Scalars['DateTime']['output'];
  vigente: Scalars['Boolean']['output'];
};

export type ErrorAceptacion = {
  mensaje: Scalars['String']['output'];
  motivo?: Maybe<MotivoErrorAceptacion>;
  puedeReintentar: Scalars['Boolean']['output'];
};

export type ErrorAutenticacion = {
  mensaje: Scalars['String']['output'];
};

export type ErrorCobro = {
  mensaje: Scalars['String']['output'];
};

export type ErrorCodigo = {
  intentosRestantes?: Maybe<Scalars['Int']['output']>;
  mensaje: Scalars['String']['output'];
  motivo?: Maybe<MotivoErrorCodigo>;
  puedeReintentar: Scalars['Boolean']['output'];
};

export type ErrorEmision = {
  mensaje: Scalars['String']['output'];
  puedeReintentar: Scalars['Boolean']['output'];
};

export type ErrorFirma = {
  mensaje: Scalars['String']['output'];
  motivo?: Maybe<MotivoErrorFirma>;
  puedeReintentar: Scalars['Boolean']['output'];
};

export type ErrorOferta = {
  mensaje: Scalars['String']['output'];
  motivo?: Maybe<MotivoErrorOferta>;
  puedeReintentar: Scalars['Boolean']['output'];
};

export type ErrorPago = {
  fallosSeguidos?: Maybe<Scalars['Int']['output']>;
  mensaje: Scalars['String']['output'];
  motivo?: Maybe<MotivoErrorPago>;
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

export type EstadoPoliza =
  | 'EMITIDA';

export type EstadoPropuesta =
  | 'ACEPTADA'
  | 'CANCELADA'
  | 'EMITIDA'
  | 'EN_EMISION'
  | 'EN_FIRMA'
  | 'EN_REVISION'
  | 'FIRMADA'
  | 'IDENTIDAD_VERIFICADA'
  | 'NO_EMITIDA'
  | 'PAGO_RECHAZADO'
  | 'PENDIENTE_PAGO';

export type EstadoUsuario =
  | 'ACTIVO'
  | 'SUSPENDIDO';

export type FactorScore = {
  nombre: Scalars['String']['output'];
  peso: Scalars['Float']['output'];
};

export type FirmaRegistrada = {
  estado: EstadoPropuesta;
  firmadaEn: Scalars['DateTime']['output'];
  propuestaId: Scalars['ID']['output'];
  referencia: Scalars['String']['output'];
};

export type FirmarPorEnlaceInput = {
  aceptaTerminos: Scalars['Boolean']['input'];
  autorizaCobro: Scalars['Boolean']['input'];
  firma: Scalars['String']['input'];
  modo: ModoFirma;
  versionDocumento: Scalars['String']['input'];
};

export type FirmarPropuestaInput = {
  autorizaCobro: Scalars['Boolean']['input'];
  propuestaId: Scalars['ID']['input'];
  versionDocumento: Scalars['String']['input'];
};

export type FuenteConsultada = {
  capturadoEn?: Maybe<Scalars['DateTime']['output']>;
  estado: EstadoFuente;
  id: Scalars['ID']['output'];
  nombre: Scalars['String']['output'];
  origen: OrigenFuente;
};

export type MedioPago = {
  marca: Scalars['String']['output'];
  tipo: TipoMedioPago;
};

export type ModoFirma =
  | 'IMAGEN'
  | 'NOMBRE'
  | 'TRAZO';

export type Monto = {
  moneda: Scalars['String']['output'];
  valor: Scalars['String']['output'];
};

export type MontoInput = {
  moneda: Scalars['String']['input'];
  valor: Scalars['String']['input'];
};

export type MotivoErrorAceptacion =
  | 'CONSENTIMIENTO_NO_VIGENTE'
  | 'OFERTA_NO_ENCONTRADA'
  | 'OFERTA_PRELIMINAR'
  | 'OFERTA_VENCIDA';

export type MotivoErrorCodigo =
  | 'CODIGO_INVALIDO'
  | 'CODIGO_VENCIDO'
  | 'INTENTOS_AGOTADOS'
  | 'PROPUESTA_NO_VALIDA';

export type MotivoErrorFirma =
  | 'COBRO_NO_AUTORIZADO'
  | 'ENLACE_VENCIDO'
  | 'IMAGEN_INVALIDA'
  | 'PROPUESTA_NO_FIRMABLE'
  | 'SERVICIO_FIRMA_NO_DISPONIBLE'
  | 'VERSION_DOCUMENTO_DESACTUALIZADA';

export type MotivoErrorOferta =
  | 'CONSENTIMIENTO_NO_VIGENTE'
  | 'DATOS_INSUFICIENTES'
  | 'FUENTES_NO_DISPONIBLES';

export type MotivoErrorPago =
  | 'ENLACE_VENCIDO'
  | 'FONDOS_INSUFICIENTES'
  | 'PAGO_RECHAZADO'
  | 'PASARELA_NO_DISPONIBLE'
  | 'REQUIERE_OTRA_TARJETA'
  | 'SESION_VENCIDA'
  | 'TARJETA_VENCIDA';

export type MotivoEstadoPropuesta =
  | 'NO_APROBADA'
  | 'PAGO_EN_PROCESO'
  | 'PAGO_FONDOS_INSUFICIENTES'
  | 'PAGO_RECHAZADO'
  | 'REVISION_MANUAL';

export type Mutation = {
  aceptarOferta: ResultadoAceptacion;
  actualizarContacto: ResultadoUsuario;
  actualizarPreferencias: ResultadoUsuario;
  cambiarRolUsuario: ResultadoUsuario;
  confirmarPago: ResultadoPago;
  contactarAsesor: ConfirmacionContacto;
  crearCobro: ResultadoCobro;
  crearUsuario: ResultadoUsuario;
  emitirPropuesta: ResultadoEmision;
  enviarCodigoVerificacion: ResultadoEnvioCodigo;
  firmarPorEnlace: ResultadoFirma;
  firmarPropuesta: ResultadoFirma;
  iniciarPago: ResultadoInicioPago;
  iniciarSesion: ResultadoSesion;
  reenviarEnlaceFirma: ResultadoEmision;
  registrarConsentimiento: Consentimiento;
  reintentarCobro: Cobro;
  revocarConsentimiento: Consentimiento;
  solicitarOferta: ResultadoOferta;
  suspenderUsuario: ResultadoUsuario;
  verificarCodigo: ResultadoVerificacion;
};


export type MutationAceptarOfertaArgs = {
  ofertaId: Scalars['ID']['input'];
};


export type MutationActualizarContactoArgs = {
  entrada: ContactoInput;
};


export type MutationActualizarPreferenciasArgs = {
  entrada: PreferenciasInput;
};


export type MutationCambiarRolUsuarioArgs = {
  id: Scalars['ID']['input'];
  rol: RolUsuario;
};


export type MutationConfirmarPagoArgs = {
  sesionId: Scalars['ID']['input'];
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


export type MutationEmitirPropuestaArgs = {
  propuestaId: Scalars['ID']['input'];
};


export type MutationEnviarCodigoVerificacionArgs = {
  correo?: InputMaybe<Scalars['String']['input']>;
  propuestaId: Scalars['ID']['input'];
};


export type MutationFirmarPorEnlaceArgs = {
  entrada: FirmarPorEnlaceInput;
};


export type MutationFirmarPropuestaArgs = {
  entrada: FirmarPropuestaInput;
};


export type MutationIniciarSesionArgs = {
  entrada: CredencialesInput;
};


export type MutationReenviarEnlaceFirmaArgs = {
  propuestaId: Scalars['ID']['input'];
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


export type MutationVerificarCodigoArgs = {
  codigo: Scalars['String']['input'];
  propuestaId: Scalars['ID']['input'];
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

export type OrigenCobro =
  | 'INTERACTIVO'
  | 'RECURRENTE';

export type OrigenFuente =
  | 'OPEN_DATA'
  | 'OPEN_FINANCE';

export type PerfilRiesgo = {
  fechaVigencia: Scalars['DateTime']['output'];
  nivelRiesgo: NivelRiesgo;
  score: Scalars['Int']['output'];
};

export type Poliza = {
  cobertura: Monto;
  documentoUrl: Scalars['String']['output'];
  estado: EstadoPoliza;
  id: Scalars['ID']['output'];
  numero: Scalars['String']['output'];
  prima: Monto;
  vigenciaDesde: Scalars['DateTime']['output'];
  vigenciaHasta: Scalars['DateTime']['output'];
};

export type PreferenciasInput = {
  idioma: Scalars['String']['input'];
  moneda: Scalars['String']['input'];
};

export type Propuesta = {
  accionSugerida?: Maybe<AccionSugerida>;
  actualizadoEn: Scalars['DateTime']['output'];
  cobertura: Monto;
  estado: EstadoPropuesta;
  id: Scalars['ID']['output'];
  mensajeEstado?: Maybe<Scalars['String']['output']>;
  motivoEstado?: Maybe<MotivoEstadoPropuesta>;
  ofertaId: Scalars['ID']['output'];
  plazoMeses: Scalars['Int']['output'];
  polizaId?: Maybe<Scalars['ID']['output']>;
  prima: Monto;
};

export type Query = {
  cobros: Array<Cobro>;
  convertirMontos: Array<Monto>;
  documentoFirma?: Maybe<DocumentoFirma>;
  firmaPorEnlace?: Maybe<EnlaceFirma>;
  oferta?: Maybe<Oferta>;
  poliza?: Maybe<Poliza>;
  propuesta?: Maybe<Propuesta>;
  usuarios: Array<Usuario>;
  yo?: Maybe<Usuario>;
};


export type QueryCobrosArgs = {
  estado?: InputMaybe<EstadoCobro>;
  pagina?: InputMaybe<Scalars['Int']['input']>;
  polizaId?: InputMaybe<Scalars['ID']['input']>;
  tamano?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryConvertirMontosArgs = {
  moneda: Scalars['String']['input'];
  montos: Array<MontoInput>;
};


export type QueryDocumentoFirmaArgs = {
  propuestaId: Scalars['ID']['input'];
};


export type QueryOfertaArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPolizaArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPropuestaArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsuariosArgs = {
  rol?: InputMaybe<RolUsuario>;
};

export type RangoPrima = {
  maxima: Monto;
  minima: Monto;
};

export type ResultadoAceptacion = ErrorAceptacion | Propuesta;

export type ResultadoCobro = Cobro | ErrorCobro;

export type ResultadoEmision = EnlaceEnviado | ErrorEmision | Propuesta;

export type ResultadoEnvioCodigo = CodigoEnviado | ErrorCodigo;

export type ResultadoFirma = ErrorFirma | FirmaRegistrada;

export type ResultadoInicioPago = ErrorPago | SesionPago;

export type ResultadoOferta = ErrorOferta | Oferta;

export type ResultadoPago = ErrorPago | Poliza;

export type ResultadoSesion = ErrorAutenticacion | Sesion;

export type ResultadoUsuario = ErrorUsuario | Usuario;

export type ResultadoVerificacion = ErrorCodigo | Propuesta;

export type RolUsuario =
  | 'ASESOR'
  | 'BACKOFFICE'
  | 'CLIENTE';

export type Sesion = {
  expiraEn: Scalars['DateTime']['output'];
  token: Scalars['String']['output'];
  usuario: Usuario;
};

export type SesionPago = {
  sesionId: Scalars['ID']['output'];
  urlPago: Scalars['String']['output'];
  venceEn: Scalars['DateTime']['output'];
};

export type SolicitudOfertaInput = {
  consentimientoId: Scalars['ID']['input'];
  direccionInmueble: Scalars['String']['input'];
  documentoIdentidad: Scalars['String']['input'];
  plazoMeses: Scalars['Int']['input'];
  valorCredito: Scalars['String']['input'];
};

export type TipoMedioPago =
  | 'CREDITO'
  | 'DEBITO';

export type TipoOferta =
  | 'COMPLETA'
  | 'PRELIMINAR';

export type Usuario = {
  creadoEn: Scalars['DateTime']['output'];
  estado: EstadoUsuario;
  id: Scalars['ID']['output'];
  idioma: Scalars['String']['output'];
  moneda: Scalars['String']['output'];
  nombre?: Maybe<Scalars['String']['output']>;
  rol: RolUsuario;
  tieneContacto: Scalars['Boolean']['output'];
  usuario: Scalars['String']['output'];
};
