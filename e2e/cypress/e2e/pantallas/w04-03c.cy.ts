import { describeConMocks } from "../../support/entorno";
import { reiniciarSiniestros } from "../../support/siniestros";
import { visitarComo } from "../../support/sesion";

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// La confirmación solo existe tras derivar en la misma sesión: sin resultado en memoria, estado vacío.
describeConMocks(
  "W04-03c · Confirmación de derivación (pantalla aislada)",
  () => {
    beforeEach(() => {
      reiniciarSiniestros();
    });

    it("tras derivar muestra insignia, radicado, perito con ciudad, tiempo con fecha y notificación", () => {
      visitarComo("BACKOFFICE", "/operador/siniestros/sin-01/derivar");
      cy.get('[data-prueba="perito"] select').select("per-03");
      cy.get('[data-prueba="confirmar"]').click();
      cy.get('[data-pantalla="W04-03c"]').within(() => {
        cy.get("h1")
          .should("have.text", "Siniestro derivado a peritaje")
          .and("have.focus");
        cy.contains("Trámite derivado").should("exist");
        cy.get('[data-prueba="subtitulo"]').should(
          "contain.text",
          "Perito asignado: Ingeniería Pericial Occidente",
        );
        cy.get('[data-prueba="panel"]')
          .should("contain.text", "#SIN-2026-")
          .and("contain.text", "Ingeniería Pericial Occidente — Cali")
          .and("contain.text", "3 días hábiles (informe a más tardar el");
        cy.contains("a", "Volver a la bandeja").click();
      });
      cy.location("pathname").should("eq", "/operador/siniestros");
    });

    it("por URL directa: estado vacío con regreso a la bandeja", () => {
      visitarComo("BACKOFFICE", "/operador/siniestros/sin-01/derivado");
      cy.get("h1").should(
        "have.text",
        "No hay una resolución reciente para mostrar.",
      );
      cy.get("main").contains("a", "Volver a la bandeja").should("exist");
    });
  },
);
