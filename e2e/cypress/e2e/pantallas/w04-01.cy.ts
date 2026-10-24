import { describeConMocks } from "../../support/entorno";
import { visitarComo } from "../../support/sesion";

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// Los datos salen del dummy real de siniestros (:8105, proxy de Vite en dev:mock): 10 siniestros, 4
// pendientes, 3 en revisión, 1 aprobado y 2 rechazados. Se reinicia antes de cada prueba.
describeConMocks("W04-01 · Bandeja de siniestros (pantalla aislada)", () => {
  beforeEach(() => {
    cy.request("POST", "/graphql/siniestros/control/reiniciar");
    visitarComo("BACKOFFICE", "/operador/siniestros");
  });

  it("muestra la bandeja con migas, cola de abiertos y los 10 siniestros", () => {
    cy.get('[data-pantalla="W04-01"]').within(() => {
      cy.get("h1").should("have.text", "Siniestros pendientes");
      cy.get('nav [aria-current="page"]').should("have.text", "Siniestros");
      cy.contains("Operador de back-office activo").should("exist");
      cy.get("table tbody tr").should("have.length", 10);
      cy.contains("Total en cola:").should("contain.text", "7 casos");
      cy.contains(
        "Mostrando 10 de 10 siniestros asignados a la mesa de control operativo",
      ).should("exist");
      cy.contains("button", "Derivado").should("not.exist");
    });
  });

  it("los chips filtran por estado y el pie lo refleja", () => {
    cy.get('[data-pantalla="W04-01"]').within(() => {
      cy.contains("button[aria-pressed]", "Todos").should(
        "have.attr",
        "aria-pressed",
        "true",
      );
      cy.contains("button[aria-pressed]", "Pendiente").click();
      cy.get("table tbody tr").should("have.length", 4);
      cy.contains("Mostrando 4 de 10").should("exist");
      cy.contains("button[aria-pressed]", "En revisión").click();
      cy.get("table tbody tr").should("have.length", 3);
      cy.contains("Mostrando 3 de 10").should("exist");
    });
  });

  it('"Abrir" lleva al detalle por id del siniestro', () => {
    cy.get('[data-pantalla="W04-01"]').within(() => {
      cy.get("table tbody tr")
        .first()
        .find("a")
        .should("have.attr", "href", "/operador/siniestros/sin-03")
        .and("have.attr", "aria-label")
        .and("contain", "SIN-2026-0152");
      cy.get("table tbody tr").first().find("a").click();
    });
    cy.location("pathname").should("eq", "/operador/siniestros/sin-03");
  });
});
