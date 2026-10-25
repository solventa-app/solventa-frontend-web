import { describeConMocks } from "../../support/entorno";
import { visitarComo } from "../../support/sesion";

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// Flujo real contra el dummy (:8107): detalle de sin-06 (PENDIENTE) → Rechazar → modal → W04-03b.
describeConMocks(
  "W04-03b · Modal de rechazo y confirmación de rechazo (pantalla aislada)",
  () => {
    beforeEach(() => {
      cy.request("POST", "/graphql/siniestros/control/reiniciar");
    });

    it("el modal se cierra con Escape y devuelve el foco a Rechazar", () => {
      visitarComo("BACKOFFICE", "/operador/siniestros/sin-06");
      cy.get('[data-prueba="rechazar"]').click();
      cy.get('[data-componente="modal-rechazo"]')
        .should("have.attr", "aria-modal", "true")
        .find("select")
        .should("have.focus");
      cy.get('[data-prueba="confirmar-rechazo"]').should("be.disabled");
      cy.focused().type("{esc}");
      cy.get('[data-componente="modal-rechazo"]').should("not.exist");
      cy.get('[data-prueba="rechazar"]').should("have.focus");
    });

    it("rechaza con motivo y comentario y muestra la confirmación", () => {
      visitarComo("BACKOFFICE", "/operador/siniestros/sin-06");
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
        cy.get('nav [aria-current="page"]').should(
          "have.text",
          "Resolución #SIN-2026-0147",
        );
        cy.get("h1")
          .should("have.text", "Siniestro rechazado")
          .and("have.focus");
        cy.contains("Trámite rechazado").should("exist");
        cy.get('[data-prueba="subtitulo"]').should(
          "have.text",
          "Siniestro #SIN-2026-0147 rechazado. Motivo: evidencia insuficiente.",
        );
        cy.get('[data-prueba="comentario"]').should(
          "contain.text",
          "Las fotos no muestran el daño reportado.",
        );
        cy.get('[data-prueba="panel"]')
          .should("contain.text", "Fecha y hora de resolución")
          .and("contain.text", "Vía de reposición / recurso");
      });
    });

    it("por URL directa: estado vacío con regreso a la bandeja", () => {
      visitarComo("BACKOFFICE", "/operador/siniestros/sin-06/rechazado");
      cy.get('nav [aria-current="page"]').should("have.text", "Resolución");
      cy.get("h1").should(
        "have.text",
        "No hay una resolución reciente para mostrar.",
      );
      cy.get("main").contains("a", "Volver a la bandeja").should("exist");
    });
  },
);
