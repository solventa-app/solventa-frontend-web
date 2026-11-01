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
   * Contrato GraphQL del BFF (v0, Sprint 1: HU-W01 y HU-W05; v0.20 suma el onboarding de HU-M01; v0.22, el estado del
   * sistema de HU-W07. La API REST de los socios está aparte, en contracts/openapi/socios-v1.json).
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

export type Archivo = {
  creadoEn: Scalars['DateTime']['output'];
  estado: EstadoArchivo;
  id: Scalars['ID']['output'];
  motivo?: Maybe<Scalars['String']['output']>;
  tamanoBytes?: Maybe<Scalars['Int']['output']>;
  tipo: Scalars['String']['output'];
  tipoContenido: Scalars['String']['output'];
};

export type Asegurado = {
  documento: Scalars['String']['output'];
  nombre: Scalars['String']['output'];
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

export type CodigoOnboardingEnviado = {
  correoEnmascarado: Scalars['String']['output'];
  venceEn: Scalars['DateTime']['output'];
};

export type ColorSalud =
  | 'AMARILLO'
  | 'ROJO'
  | 'VERDE';

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
  rol?: InputMaybe<RolUsuario>;
  usuario: Scalars['String']['input'];
};

export type CuentaOnboarding = {
  onboarding: Onboarding;
  sesion: Sesion;
};

export type CuentaOnboardingInput = {
  clave: Scalars['String']['input'];
  correo: Scalars['String']['input'];
};

export type DescargaArchivo = {
  url: Scalars['String']['output'];
  venceEn: Scalars['DateTime']['output'];
};

export type DocumentoFirma = {
  formaCobro: Scalars['String']['output'];
  meses: Scalars['Int']['output'];
  montoMensual: Monto;
  propuestaId: Scalars['ID']['output'];
  resumen: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type EncabezadoSubida = {
  nombre: Scalars['String']['output'];
  valor: Scalars['String']['output'];
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
  venceEn?: Maybe<Scalars['DateTime']['output']>;
  vigente: Scalars['Boolean']['output'];
};

export type ErrorAceptacion = {
  mensaje: Scalars['String']['output'];
  motivo?: Maybe<MotivoErrorAceptacion>;
  puedeReintentar: Scalars['Boolean']['output'];
};

export type ErrorArchivo = {
  codigo: Scalars['String']['output'];
  mensaje: Scalars['String']['output'];
};

export type ErrorAutenticacion = {
  codigo?: Maybe<Scalars['String']['output']>;
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

export type ErrorOnboarding = {
  codigo: Scalars['String']['output'];
  mensaje: Scalars['String']['output'];
};

export type ErrorPago = {
  fallosSeguidos?: Maybe<Scalars['Int']['output']>;
  mensaje: Scalars['String']['output'];
  motivo?: Maybe<MotivoErrorPago>;
  puedeReintentar: Scalars['Boolean']['output'];
};

export type ErrorSiniestro = {
  mensaje: Scalars['String']['output'];
};

export type ErrorUsuario = {
  mensaje: Scalars['String']['output'];
};

export type EstadoArchivo =
  | 'DISPONIBLE'
  | 'ELIMINADO'
  | 'PENDIENTE'
  | 'RECHAZADO';

export type EstadoCircuito =
  | 'ABIERTO'
  | 'CERRADO'
  | 'DESCONOCIDO'
  | 'SEMIABIERTO';

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

export type EstadoOnboarding =
  | 'EN_REVISION'
  | 'EN_VERIFICACION'
  | 'INICIADO'
  | 'RECHAZADA'
  | 'VERIFICADA';

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

export type EstadoSiniestro =
  | 'APROBADO'
  | 'EN_REVISION'
  | 'PENDIENTE'
  | 'RECHAZADO';

export type EstadoSistema = {
  apis: Array<SaludApi>;
  calculadoEn: Scalars['DateTime']['output'];
  color: ColorSalud;
  disponibilidad?: Maybe<Scalars['Float']['output']>;
  latenciaMediaMs?: Maybe<Scalars['Int']['output']>;
  micros: Array<SaludMicro>;
  porcentaje: Scalars['Int']['output'];
  ventana: Scalars['String']['output'];
};

export type EstadoUsuario =
  | 'ACTIVO'
  | 'PENDIENTE_VERIFICACION'
  | 'RECHAZADA'
  | 'SUSPENDIDO';

export type EstadoVisible =
  | 'EMITIDA'
  | 'EMITIENDO'
  | 'NO_EMITIDA';

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
  imagenArchivoId?: InputMaybe<Scalars['ID']['input']>;
  modo: ModoFirma;
  nombreFirma?: InputMaybe<Scalars['String']['input']>;
  propuestaId?: InputMaybe<Scalars['ID']['input']>;
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

export type IniciarOnboardingInput = {
  jurisdiccion?: Scalars['String']['input'];
  tipoDocumento: TipoDocumentoOnboarding;
};

export type InicioOnboarding = {
  onboarding: Onboarding;
  token: Scalars['String']['output'];
  tokenVenceEn: Scalars['DateTime']['output'];
};

export type Jurisdiccion = {
  codigo: Scalars['String']['output'];
  moneda: Scalars['String']['output'];
  nombre: Scalars['String']['output'];
  plazoMax: Scalars['Int']['output'];
  plazoMin: Scalars['Int']['output'];
  tipoDocumento: Scalars['String']['output'];
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

export type MotivoOnboarding =
  | 'DOCUMENTO_YA_REGISTRADO'
  | 'ILEGIBLE'
  | 'IMAGEN_NO_DISPONIBLE'
  | 'MENOR_DE_EDAD'
  | 'PROVEEDOR_NO_DISPONIBLE'
  | 'ROSTRO_NO_COINCIDE'
  | 'SUPLANTACION';

export type MotivoRechazo =
  | 'EVIDENCIA_INSUFICIENTE'
  | 'FUERA_DE_COBERTURA'
  | 'INCONSISTENCIA_EN_RELATO'
  | 'OTRO'
  | 'POLIZA_NO_VIGENTE';

export type Mutation = {
  aceptarOferta: ResultadoAceptacion;
  actualizarContacto: ResultadoUsuario;
  actualizarPreferencias: ResultadoUsuario;
  actualizarSesion: ResultadoSesion;
  aprobarSiniestro: ResultadoResolucion;
  cambiarRolUsuario: ResultadoUsuario;
  cerrarSesion: Scalars['Boolean']['output'];
  confirmarPago: ResultadoPago;
  confirmarSubidaArchivo: ResultadoArchivo;
  confirmarSubidaOnboarding: ResultadoOnboarding;
  contactarAsesor: ConfirmacionContacto;
  crearCobro: ResultadoCobro;
  crearCuentaOnboarding: ResultadoCuentaOnboarding;
  crearUsuario: ResultadoUsuario;
  derivarSiniestro: ResultadoResolucion;
  descargarArchivo: ResultadoDescargaArchivo;
  emitirPropuesta: ResultadoEmision;
  enviarCodigoOnboarding: ResultadoCodigoOnboarding;
  enviarCodigoVerificacion: ResultadoEnvioCodigo;
  enviarVerificacion: ResultadoOnboarding;
  firmarPorEnlace: ResultadoFirma;
  firmarPropuesta: ResultadoFirma;
  iniciarOnboarding: ResultadoInicioOnboarding;
  iniciarPago: ResultadoInicioPago;
  iniciarSesion: ResultadoSesion;
  rechazarSiniestro: ResultadoResolucion;
  reenviarEnlaceFirma: ResultadoEmision;
  registrarConsentimiento: Consentimiento;
  registrarConsentimientoOnboarding: ResultadoOnboarding;
  registrarCuenta: ResultadoSesion;
  reintentarCobro: Cobro;
  reintentarOnboarding: ResultadoOnboarding;
  renovarSesion: ResultadoSesion;
  revocarConsentimiento: Consentimiento;
  solicitarOferta: ResultadoOferta;
  solicitarSubidaArchivo: ResultadoSubidaArchivo;
  solicitarSubidaFirma: ResultadoSubidaArchivo;
  solicitarSubidaOnboarding: ResultadoSubidaOnboarding;
  suspenderUsuario: ResultadoUsuario;
  ticketAvisos: TicketAvisos;
  verificarCodigo: ResultadoVerificacion;
  verificarCodigoOnboarding: ResultadoCodigoOnboarding;
};


export type MutationAceptarOfertaArgs = {
  contacto?: InputMaybe<ContactoTitularInput>;
  ofertaId: Scalars['ID']['input'];
};


export type MutationActualizarContactoArgs = {
  entrada: ContactoInput;
};


export type MutationActualizarPreferenciasArgs = {
  entrada: PreferenciasInput;
};


export type MutationAprobarSiniestroArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCambiarRolUsuarioArgs = {
  id: Scalars['ID']['input'];
  rol: RolUsuario;
};


export type MutationCerrarSesionArgs = {
  refreshToken?: InputMaybe<Scalars['String']['input']>;
};


export type MutationConfirmarPagoArgs = {
  propuestaId?: InputMaybe<Scalars['ID']['input']>;
  sesionId: Scalars['ID']['input'];
};


export type MutationConfirmarSubidaArchivoArgs = {
  id: Scalars['ID']['input'];
};


export type MutationConfirmarSubidaOnboardingArgs = {
  archivoId: Scalars['ID']['input'];
  onboardingId: Scalars['ID']['input'];
};


export type MutationContactarAsesorArgs = {
  canal: CanalContacto;
  ofertaId: Scalars['ID']['input'];
};


export type MutationCrearCobroArgs = {
  entrada: CrearCobroInput;
};


export type MutationCrearCuentaOnboardingArgs = {
  entrada: CuentaOnboardingInput;
  onboardingId: Scalars['ID']['input'];
};


export type MutationCrearUsuarioArgs = {
  entrada: CrearUsuarioInput;
};


export type MutationDerivarSiniestroArgs = {
  id: Scalars['ID']['input'];
  instrucciones?: InputMaybe<Scalars['String']['input']>;
  peritoId: Scalars['ID']['input'];
};


export type MutationDescargarArchivoArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEmitirPropuestaArgs = {
  propuestaId: Scalars['ID']['input'];
};


export type MutationEnviarCodigoOnboardingArgs = {
  correo: Scalars['String']['input'];
};


export type MutationEnviarCodigoVerificacionArgs = {
  correo?: InputMaybe<Scalars['String']['input']>;
  propuestaId: Scalars['ID']['input'];
};


export type MutationEnviarVerificacionArgs = {
  onboardingId: Scalars['ID']['input'];
};


export type MutationFirmarPorEnlaceArgs = {
  entrada: FirmarPorEnlaceInput;
};


export type MutationFirmarPropuestaArgs = {
  entrada: FirmarPropuestaInput;
};


export type MutationIniciarOnboardingArgs = {
  entrada: IniciarOnboardingInput;
};


export type MutationIniciarPagoArgs = {
  propuestaId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationIniciarSesionArgs = {
  entrada: CredencialesInput;
};


export type MutationRechazarSiniestroArgs = {
  comentario?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  motivo: MotivoRechazo;
};


export type MutationReenviarEnlaceFirmaArgs = {
  propuestaId: Scalars['ID']['input'];
};


export type MutationRegistrarConsentimientoArgs = {
  entrada: ConsentimientoInput;
};


export type MutationRegistrarConsentimientoOnboardingArgs = {
  onboardingId: Scalars['ID']['input'];
  versionTexto: Scalars['String']['input'];
};


export type MutationRegistrarCuentaArgs = {
  clave: Scalars['String']['input'];
  codigo: Scalars['String']['input'];
  correo: Scalars['String']['input'];
};


export type MutationReintentarCobroArgs = {
  cobroId: Scalars['ID']['input'];
};


export type MutationReintentarOnboardingArgs = {
  onboardingId: Scalars['ID']['input'];
};


export type MutationRenovarSesionArgs = {
  refreshToken?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRevocarConsentimientoArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSolicitarOfertaArgs = {
  entrada: SolicitudOfertaInput;
};


export type MutationSolicitarSubidaArchivoArgs = {
  entrada: SolicitudSubidaArchivoInput;
};


export type MutationSolicitarSubidaFirmaArgs = {
  propuestaId?: InputMaybe<Scalars['ID']['input']>;
  tamanoBytes: Scalars['Int']['input'];
  tipoContenido: Scalars['String']['input'];
};


export type MutationSolicitarSubidaOnboardingArgs = {
  onboardingId: Scalars['ID']['input'];
  paso: PasoOnboarding;
  tamanoBytes: Scalars['Int']['input'];
  tipoContenido: Scalars['String']['input'];
};


export type MutationSuspenderUsuarioArgs = {
  id: Scalars['ID']['input'];
};


export type MutationVerificarCodigoArgs = {
  codigo: Scalars['String']['input'];
  propuestaId: Scalars['ID']['input'];
};


export type MutationVerificarCodigoOnboardingArgs = {
  codigo: Scalars['String']['input'];
  correo: Scalars['String']['input'];
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

export type Onboarding = {
  estado: EstadoOnboarding;
  id: Scalars['ID']['output'];
  intento: Scalars['Int']['output'];
  intentosRestantes: Scalars['Int']['output'];
  motivo?: Maybe<MotivoOnboarding>;
};

export type OrigenCobro =
  | 'INTERACTIVO'
  | 'RECURRENTE';

export type OrigenFuente =
  | 'OPEN_DATA'
  | 'OPEN_FINANCE';

export type PaginaPropuestas = {
  pagina: Scalars['Int']['output'];
  propuestas: Array<Propuesta>;
  tamano: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type PasoOnboarding =
  | 'ANVERSO'
  | 'REVERSO'
  | 'ROSTRO'
  | 'VIDEO';

export type PerfilRiesgo = {
  fechaVigencia: Scalars['DateTime']['output'];
  nivelRiesgo: NivelRiesgo;
  score: Scalars['Int']['output'];
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
  documentoUrl: Scalars['String']['output'];
  estado: EstadoPoliza;
  id: Scalars['ID']['output'];
  numero: Scalars['String']['output'];
  prima: Monto;
  ramo: Scalars['String']['output'];
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
  creadaEn?: Maybe<Scalars['DateTime']['output']>;
  estado: EstadoPropuesta;
  estadoVisible?: Maybe<EstadoVisible>;
  id: Scalars['ID']['output'];
  mensajeEstado?: Maybe<Scalars['String']['output']>;
  motivoEstado?: Maybe<MotivoEstadoPropuesta>;
  nombreAsesor?: Maybe<Scalars['String']['output']>;
  nombreSocio?: Maybe<Scalars['String']['output']>;
  nombreTitular?: Maybe<Scalars['String']['output']>;
  ofertaId: Scalars['ID']['output'];
  plazoMeses: Scalars['Int']['output'];
  poliza?: Maybe<Poliza>;
  polizaId?: Maybe<Scalars['ID']['output']>;
  prima: Monto;
};

export type Query = {
  archivo?: Maybe<Archivo>;
  cobros: Array<Cobro>;
  convertirMontos: Array<Monto>;
  documentoFirma?: Maybe<DocumentoFirma>;
  estadoSistema: EstadoSistema;
  firmaPorEnlace?: Maybe<EnlaceFirma>;
  jurisdicciones: Array<Jurisdiccion>;
  miVerificacion?: Maybe<Onboarding>;
  oferta?: Maybe<Oferta>;
  onboarding?: Maybe<Onboarding>;
  peritos: Array<Perito>;
  poliza?: Maybe<Poliza>;
  propuesta?: Maybe<Propuesta>;
  propuestas: PaginaPropuestas;
  siniestro?: Maybe<Siniestro>;
  siniestros: Array<Siniestro>;
  usuarios: Array<Usuario>;
  yo?: Maybe<Usuario>;
};


export type QueryArchivoArgs = {
  id: Scalars['ID']['input'];
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


export type QueryEstadoSistemaArgs = {
  ventana?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFirmaPorEnlaceArgs = {
  propuestaId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryOfertaArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOnboardingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPeritosArgs = {
  siniestroId: Scalars['ID']['input'];
};


export type QueryPolizaArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPropuestaArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPropuestasArgs = {
  estado?: InputMaybe<EstadoVisible>;
  pagina?: InputMaybe<Scalars['Int']['input']>;
  tamano?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySiniestroArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySiniestrosArgs = {
  estado?: InputMaybe<EstadoSiniestro>;
};


export type QueryUsuariosArgs = {
  rol?: InputMaybe<RolUsuario>;
};

export type RangoPrima = {
  maxima: Monto;
  minima: Monto;
};

export type Resolucion = {
  automatica: Scalars['Boolean']['output'];
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

export type ResultadoAceptacion = ErrorAceptacion | Propuesta;

export type ResultadoArchivo = Archivo | ErrorArchivo;

export type ResultadoCobro = Cobro | ErrorCobro;

export type ResultadoCodigoOnboarding = CodigoOnboardingEnviado | ErrorOnboarding;

export type ResultadoCuentaOnboarding = CuentaOnboarding | ErrorOnboarding;

export type ResultadoDescargaArchivo = DescargaArchivo | ErrorArchivo;

export type ResultadoEmision = EnlaceEnviado | ErrorEmision | Propuesta;

export type ResultadoEnvioCodigo = CodigoEnviado | ErrorCodigo;

export type ResultadoFirma = ErrorFirma | FirmaRegistrada;

export type ResultadoInicioOnboarding = ErrorOnboarding | InicioOnboarding;

export type ResultadoInicioPago = ErrorPago | SesionPago;

export type ResultadoOferta = ErrorOferta | Oferta;

export type ResultadoOnboarding = ErrorOnboarding | Onboarding;

export type ResultadoPago = ErrorPago | Poliza;

export type ResultadoResolucion = ErrorSiniestro | Siniestro;

export type ResultadoSesion = ErrorAutenticacion | Sesion;

export type ResultadoSubidaArchivo = ErrorArchivo | SubidaArchivo;

export type ResultadoSubidaOnboarding = ErrorOnboarding | SubidaArchivo;

export type ResultadoUsuario = ErrorUsuario | Usuario;

export type ResultadoVerificacion = ErrorCodigo | Propuesta;

export type RolUsuario =
  | 'ASESOR'
  | 'BACKOFFICE'
  | 'CLIENTE';

export type SaludApi = {
  color: ColorSalud;
  externas: Array<SaludExterna>;
  micros: Array<Scalars['String']['output']>;
  nombre: Scalars['String']['output'];
  porcentaje: Scalars['Int']['output'];
};

export type SaludExterna = {
  estado: EstadoCircuito;
  nombre: Scalars['String']['output'];
};

export type SaludMicro = {
  color: ColorSalud;
  disponibilidad?: Maybe<Scalars['Float']['output']>;
  latenciaMediaMs?: Maybe<Scalars['Int']['output']>;
  latenciaP95Ms?: Maybe<Scalars['Int']['output']>;
  nombre: Scalars['String']['output'];
  peso: Scalars['Int']['output'];
  porcentaje: Scalars['Int']['output'];
  responde: Scalars['Boolean']['output'];
  sinTrafico: Scalars['Boolean']['output'];
};

export type Sesion = {
  expiraEn: Scalars['DateTime']['output'];
  refreshExpiraEn?: Maybe<Scalars['DateTime']['output']>;
  refreshToken?: Maybe<Scalars['String']['output']>;
  token: Scalars['String']['output'];
  usuario: Usuario;
};

export type SesionPago = {
  sesionId: Scalars['ID']['output'];
  urlPago: Scalars['String']['output'];
  venceEn: Scalars['DateTime']['output'];
};

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

export type SolicitudOfertaInput = {
  consentimientoId: Scalars['ID']['input'];
  direccionInmueble: Scalars['String']['input'];
  documentoIdentidad?: InputMaybe<Scalars['String']['input']>;
  plazoMeses: Scalars['Int']['input'];
  valorCredito: Scalars['String']['input'];
};

export type SolicitudSubidaArchivoInput = {
  consentimientoId?: InputMaybe<Scalars['ID']['input']>;
  propietarioId?: InputMaybe<Scalars['ID']['input']>;
  tamanoBytes: Scalars['Int']['input'];
  tipo: Scalars['String']['input'];
  tipoContenido: Scalars['String']['input'];
};

export type SubidaArchivo = {
  archivo: Archivo;
  encabezados: Array<EncabezadoSubida>;
  metodo: Scalars['String']['output'];
  url: Scalars['String']['output'];
  venceEn: Scalars['DateTime']['output'];
};

export type TicketAvisos = {
  ticket: Scalars['String']['output'];
  url: Scalars['String']['output'];
  venceEn: Scalars['DateTime']['output'];
};

export type TipoDocumentoOnboarding =
  | 'CC'
  | 'CE';

export type TipoEvidencia =
  | 'DOCUMENTO'
  | 'FOTO';

export type TipoMedioPago =
  | 'CREDITO'
  | 'DEBITO';

export type TipoOferta =
  | 'COMPLETA'
  | 'PRELIMINAR';

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

export type Usuario = {
  correo?: Maybe<Scalars['String']['output']>;
  creadoEn: Scalars['DateTime']['output'];
  documentoEnmascarado?: Maybe<Scalars['String']['output']>;
  estado: EstadoUsuario;
  id: Scalars['ID']['output'];
  idioma: Scalars['String']['output'];
  moneda: Scalars['String']['output'];
  nombre?: Maybe<Scalars['String']['output']>;
  rol: RolUsuario;
  tieneContacto: Scalars['Boolean']['output'];
  usuario: Scalars['String']['output'];
};

export type Verificacion = {
  cumple: Scalars['Boolean']['output'];
  descripcion: Scalars['String']['output'];
};
