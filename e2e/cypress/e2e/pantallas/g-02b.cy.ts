import { visitarComo } from "../../support/sesion";

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
describe("G-02b · Home del Operador (pantalla aislada)", () => {
  beforeEach(() => visitarComo("BACKOFFICE", "/operador"));

  it("existe con las tarjetas de Siniestros y Conciliación de pagos como enlaces", () => {
    cy.get('[data-pantalla="G-02b"]').within(() => {
      cy.contains("a", "Conciliación de pagos").should(
        "have.attr",
        "href",
        "/operador/conciliacion",
      );
      cy.contains("a", "Siniestros").should(
        "have.attr",
        "href",
        "/operador/siniestros",
      );
    });
  });

  it('"Cerrar sesión" limpia la sesión y vuelve a /login', () => {
    cy.get('[data-pantalla="G-02b"]').within(() => {
      cy.contains("button", "Cerrar sesión").click();
    });
    // G-04: se confirma en el modal, que muestra el nombre de quien cierra.
    cy.get('[role="dialog"]').contains("button", "Cerrar sesión").click();
    cy.location("pathname").should("eq", "/login");
  });
});
