import { describeConMocks } from "../../support/entorno";
import { visitarComo } from "../../support/sesion";

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// Flujo real contra el dummy (:8107): detalle de sin-01 (PENDIENTE) → Aprobar → W04-03a.
describeConMocks(
  "W04-03a · Confirmación de aprobación (pantalla aislada)",
  () => {
    beforeEach(() => {
      cy.request("POST", "/graphql/siniestros/control/reiniciar");
    });

    it("tras aprobar muestra insignia, indemnización es-CO, método y plazo", () => {
      visitarComo("BACKOFFICE", "/operador/siniestros/sin-01");
      cy.get('[data-prueba="aprobar"]').click();
      cy.location("pathname").should(
        "eq",
        "/operador/siniestros/sin-01/aprobado",
      );
      cy.get('[data-pantalla="W04-03a"]').within(() => {
        cy.get('nav [aria-current="page"]').should("have.text", "Aprobación");
        cy.get("h1")
          .should("have.text", "Siniestro aprobado")
          .and("have.focus");
        cy.contains("Trámite liquidado").should("exist");
        cy.get('[data-prueba="subtitulo"]')
          .invoke("text")
          .should(
            "match",
            /Siniestro #SIN-2026-0141 aprobado\. Indemnización de \$\s[\d.]+ será depositada/,
          );
        cy.get('[data-prueba="monto"]')
          .invoke("text")
          .should("match", /^\$\s\d{1,3}(\.\d{3})+/);
        cy.get('[data-prueba="panel"]').should(
          "contain.text",
          "Método de transferencia",
        );
        cy.contains("a", "Volver a la bandeja").click();
      });
      cy.location("pathname").should("eq", "/operador/siniestros");
    });

    it("por URL directa: estado vacío con regreso a la bandeja", () => {
      visitarComo("BACKOFFICE", "/operador/siniestros/sin-01/aprobado");
      cy.get("h1").should(
        "have.text",
        "No hay una resolución reciente para mostrar.",
      );
      cy.get("main").contains("a", "Volver a la bandeja").should("exist");
    });
  },
);
