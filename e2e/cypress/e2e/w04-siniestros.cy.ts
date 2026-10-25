import { describeConMocks } from "../support/entorno";
import { ingresar } from "../support/sesion";

// E2E de la historia HU-W04 (ver nota de convención en w01-oferta.cy.ts: cruza varias pantallas a propósito;
// el E2E por pantalla vive en cypress/e2e/pantallas/w04-*.cy.ts). Corre contra el dummy real de siniestros
// (:8107, proxy de Vite en dev:mock), que se reinicia antes de cada prueba: 10 siniestros, 4 pendientes
// (sin-03, sin-01, sin-06 y sin-10), 3 en revisión, 2 aprobados y 1 rechazado. Cada prueba usa un caso
// distinto para no depender del orden: derivar sin-03, aprobar sin-01 y rechazar sin-06.
describeConMocks("HU-W04 · Mesa de siniestros (back-office)", () => {
  beforeEach(() => {
    cy.request("POST", "/graphql/siniestros/control/reiniciar");
    ingresar("BACKOFFICE");
    cy.contains("a", "Siniestros").click();
    cy.location("pathname").should("eq", "/operador/siniestros");
  });

  function filtrar(estado: string, filas: number): void {
    cy.get('[data-pantalla="W04-01"]').within(() => {
      cy.contains("button[aria-pressed]", estado).click();
      cy.get("table tbody tr").should("have.length", filas);
    });
  }

  function abrir(radicado: string): void {
    cy.get('[data-pantalla="W04-01"]')
      .contains("tr", radicado)
      .find("a")
      .click();
    cy.get('[data-pantalla="W04-02"]').should("exist");
  }

  it("G-02b → W04-01 → W04-02 → W04-02b → W04-03c: deriva a perito y el caso queda en revisión con perito", () => {
    cy.get('[data-pantalla="W04-01"]').within(() => {
      cy.get("table tbody tr").should("have.length", 10);
      cy.get('[data-prueba="total-cola"]').should("contain.text", "7 casos");
    });
    filtrar("Pendiente", 4);
    abrir("SIN-2026-0152");
    cy.location("pathname").should("eq", "/operador/siniestros/sin-03");

    cy.get('[data-prueba="derivar"]').click();
    cy.get('[data-pantalla="W04-02b"]').within(() => {
      cy.get('[data-prueba="perito"] select').select("per-03");
      cy.get('[data-prueba="instrucciones"] textarea').type(
        "Revisar historia clínica",
      );
      cy.get('[data-prueba="confirmar"]').click();
    });
    cy.location("pathname").should(
      "eq",
      "/operador/siniestros/sin-03/derivado",
    );
    cy.get('[data-pantalla="W04-03c"]').within(() => {
      cy.get("h1").should("have.text", "Siniestro derivado a peritaje");
      cy.get('[data-prueba="panel"]').should("contain.text", "#SIN-2026-0152");
      cy.contains("a", "Volver a la bandeja").click();
    });

    cy.location("pathname").should("eq", "/operador/siniestros");
    cy.get('[data-pantalla="W04-01"]').within(() => {
      // Sigue abierto (en revisión): la cola no cambia.
      cy.get('[data-prueba="total-cola"]').should("contain.text", "7 casos");
      cy.contains("tr", "SIN-2026-0152").should("contain.text", "En revisión");
    });
    filtrar("Pendiente", 3);
    filtrar("En revisión", 4);
    abrir("SIN-2026-0152");
    cy.get('[data-prueba="perito"]').should(
      "contain.text",
      "Ingeniería Pericial Occidente",
    );
  });

  it("aprueba un pendiente → W04-03a y la bandeja lo muestra aprobado", () => {
    abrir("SIN-2026-0141");
    cy.get('[data-prueba="aprobar"]').click();
    cy.location("pathname").should(
      "eq",
      "/operador/siniestros/sin-01/aprobado",
    );
    cy.get('[data-pantalla="W04-03a"]').within(() => {
      cy.get("h1").should("have.text", "Siniestro aprobado");
      cy.contains("a", "Volver a la bandeja").click();
    });

    cy.get('[data-pantalla="W04-01"]').within(() => {
      cy.get('[data-prueba="total-cola"]').should("contain.text", "6 casos");
      cy.contains("tr", "SIN-2026-0141").should("contain.text", "Aprobado");
    });
    filtrar("Pendiente", 3);
    filtrar("Aprobado", 3);
  });

  it("rechaza otro pendiente con el modal (motivo y comentario) → W04-03b y la bandeja lo muestra rechazado", () => {
    abrir("SIN-2026-0147");
    cy.get('[data-prueba="rechazar"]').click();
    cy.get('[data-componente="modal-rechazo"]').within(() => {
      cy.get("select").select("EVIDENCIA_INSUFICIENTE");
      cy.get("textarea").type("Las fotos no muestran el daño reportado.");
      cy.get('[data-prueba="confirmar-rechazo"]').click();
    });
    cy.location("pathname").should(
      "eq",
      "/operador/siniestros/sin-06/rechazado",
    );
    cy.get('[data-pantalla="W04-03b"]').within(() => {
      cy.get("h1").should("have.text", "Siniestro rechazado");
      cy.get('[data-prueba="subtitulo"]').should(
        "contain.text",
        "Motivo: evidencia insuficiente.",
      );
      cy.contains("a", "Volver a la bandeja").click();
    });

    cy.get('[data-pantalla="W04-01"]').within(() => {
      cy.get('[data-prueba="total-cola"]').should("contain.text", "6 casos");
      cy.contains("tr", "SIN-2026-0147").should("contain.text", "Rechazado");
    });
    filtrar("Pendiente", 3);
    filtrar("Rechazado", 2);
  });
});
