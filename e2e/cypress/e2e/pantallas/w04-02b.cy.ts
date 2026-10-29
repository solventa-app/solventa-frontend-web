import { describeConMocks } from "../../support/entorno";
import { reiniciarSiniestros } from "../../support/siniestros";
import { visitarComo } from "../../support/sesion";

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// Datos de la semilla de siniestros del backend real local (ver support/siniestros.ts): sin-01 PENDIENTE, sin-04 EN_REVISION
// derivado y sin-05 APROBADO. Se reinicia antes de cada prueba.
describeConMocks("W04-02b · Derivar a perito (pantalla aislada)", () => {
  beforeEach(() => {
    reiniciarSiniestros();
  });

  it("desde el detalle: elegir perito, ver su tiempo y confirmar lleva a la confirmación", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-01");
    cy.get('[data-prueba="derivar"]').click();
    cy.location("pathname").should("eq", "/operador/siniestros/sin-01/derivar");
    cy.get('[data-pantalla="W04-02b"]').within(() => {
      cy.get('nav [aria-current="page"]').should("have.text", "Derivar");
      cy.get("h1").should("contain.text", "a peritaje").and("have.focus");
      cy.get('[data-prueba="confirmar"]').should("be.disabled");
      cy.contains("Elige un perito para continuar.").should("exist");
      cy.get('[data-prueba="perito"] select').select("per-02");
      cy.get('[data-prueba="tiempo"]').should(
        "contain.text",
        "Tiempo estimado de respuesta: 5 días hábiles",
      );
      cy.get('[data-prueba="instrucciones"] textarea').type(
        "Verificar radiador",
      );
      cy.get("[data-contador]").should("have.text", "18 / 500 caracteres");
      cy.get('[data-prueba="confirmar"]').should("not.be.disabled").click();
    });
    cy.location("pathname").should(
      "eq",
      "/operador/siniestros/sin-01/derivado",
    );
    cy.get('[data-pantalla="W04-03c"]').should("exist");
  });

  it("Cancelar vuelve al detalle sin cambios", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-01/derivar");
    cy.get('[data-prueba="perito"] select').select("per-01");
    cy.get('[data-prueba="cancelar"]').click();
    cy.location("pathname").should("eq", "/operador/siniestros/sin-01");
    cy.contains("Pendiente de dictamen").should("exist");
  });

  it("ya derivado: sin formulario y con el perito asignado", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-04/derivar");
    cy.get("form").should("not.exist");
    cy.get('[data-prueba="no-admite"]')
      .should(
        "contain.text",
        "Este siniestro ya no admite una nueva derivación.",
      )
      .and("contain.text", "Peritazgos Antioquia & Cía.");
  });

  it("ya aprobado: sin formulario", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-05/derivar");
    cy.get('[data-prueba="no-admite"]').should(
      "contain.text",
      "Ya fue aprobado.",
    );
  });

  it("id inexistente: no encontrado", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-99/derivar");
    cy.contains("No encontramos este siniestro.").should("exist");
  });
});
