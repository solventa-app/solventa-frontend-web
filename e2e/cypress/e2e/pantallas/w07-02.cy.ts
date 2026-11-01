// E2E por pantalla individual (ver la convención en g-01.cy.ts). W07-02 · Panel del socio (HU-W07), contra los mocks
// de MSW (src/mocks/socios.ts): presupuesto 842 / 1.000 en producción y la ventana de 15 min «sin tráfico".
import { describeConMocks } from "../../support/entorno";

function ingresarComoSocio() {
  cy.visit("/socios/ingreso");
  cy.get('[data-pantalla="W07-01"]').within(() => {
    cy.contains("label", "ID de socio")
      .parent()
      .find("input")
      .type("retail-fintech-042");
    cy.get('input[type="password"]').type("sk_live_9f2c41d7e8a05b36c1f4", {
      log: false,
    });
    cy.contains("button", "Ingresar").click();
  });
  cy.location("pathname").should("eq", "/socios/panel");
}

describeConMocks("W07-02 · Panel del socio (pantalla aislada)", () => {
  beforeEach(ingresarComoSocio);

  it("muestra las tres tarjetas con los datos del entorno de producción", () => {
    cy.get('[data-pantalla="W07-02"]').within(() => {
      cy.contains("Retail Fintech S.A.S. · Socio de distribución").should(
        "exist",
      );
      cy.get('[data-prueba="socio-id"]').should(
        "have.text",
        "retail-fintech-042",
      );
      cy.get('[data-prueba="cotizaciones"]')
        .should("contain.text", "842")
        .and("contain.text", "1.000");
      cy.get('[data-prueba="caja-estado"]').should("contain.text", "Operativo");
      cy.get('[data-prueba="grafico-llamadas"]').should("be.visible");
      cy.get('[data-prueba="tabla-ventas"]').should(
        "contain.text",
        "Octubre de 2026",
      );
    });
  });

  it("el entorno de pruebas cambia las credenciales y marca las ventas como simuladas", () => {
    cy.get('[data-pantalla="W07-02"]').within(() => {
      cy.contains('[role="radio"]', "Pruebas (sandbox)").click();
      cy.get('[data-prueba="socio-id"]').should(
        "have.text",
        "retail-fintech-042-pruebas",
      );
      cy.contains("Datos simulados").should("be.visible");
    });
  });

  it("regenerar pide confirmación y muestra la clave nueva", () => {
    cy.contains("button", "Regenerar").click();
    cy.get('[data-componente="modal-regenerar"]').within(() => {
      cy.contains("deja de funcionar de inmediato").should("be.visible");
      cy.contains("button", "Regenerar clave").click();
      cy.get('[data-prueba="clave-nueva"]')
        .invoke("text")
        .should("match", /^sk_live_/);
      cy.contains("button", "Listo").click();
    });
    cy.get('[data-componente="modal-regenerar"]').should("not.exist");
  });

  it("la ventana de 15 min muestra «sin tráfico» y «Documentación de la API» lleva a W07-03", () => {
    cy.get('[data-prueba="tarjeta-estado"]').within(() => {
      cy.contains('[role="radio"]', "15 min").click();
      cy.contains("Sin tráfico en la ventana").should("be.visible");
    });
    cy.contains('[role="tab"]', "Guía de integración").click();
    cy.location("pathname").should("eq", "/socios/documentacion");
  });

  for (const [ancho, alto] of [
    [1280, 720],
    [390, 844],
  ]) {
    it(`a ${ancho}px no se desborda y las tarjetas ${ancho < 1024 ? "se apilan" : "van en tres columnas"}`, () => {
      cy.viewport(ancho, alto);
      cy.document().then((doc) =>
        expect(doc.documentElement.scrollWidth).to.be.at.most(ancho),
      );
      cy.get('[data-prueba="cotizaciones"]').should("exist");
      // Se reintenta hasta que la maqueta se asiente (las secciones cargan por separado); 2 px de tolerancia.
      cy.get('[data-prueba="tarjeta-credenciales"]').should(($credenciales) => {
        const consumo = Cypress.$('[data-prueba="tarjeta-consumo"]')[0];
        const diferencia = Math.abs(
          $credenciales[0].getBoundingClientRect().top -
            consumo.getBoundingClientRect().top,
        );
        expect(diferencia < 2).to.eq(ancho >= 1024);
      });
      cy.screenshot(`w07-02-${ancho}`, { capture: "viewport" });
    });
  }
});
