import { describeConMocks } from "../../support/entorno";
import { reiniciarSiniestros } from "../../support/siniestros";
import { visitarComo } from "../../support/sesion";

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// Datos de la semilla de siniestros del backend real local (ver support/siniestros.ts): sin-01 PENDIENTE, sin-04 EN_REVISION
// derivado, sin-05 APROBADO y sin-09 RECHAZADO (una verificación no cumple). Se reinicia antes de cada prueba.
describeConMocks("W04-02 · Detalle del siniestro (pantalla aislada)", () => {
  beforeEach(() => {
    reiniciarSiniestros();
  });

  it("muestra migas, datos, galería, SFC, tiempo restante y las tres acciones", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-01");
    cy.get('[data-pantalla="W04-02"]').within(() => {
      cy.get('nav [aria-current="page"]').should(
        "have.text",
        "Detalle #SIN-2026-0141",
      );
      cy.contains("Operador de back-office activo").should("exist");
      cy.get('[data-prueba="datos"]')
        .should("contain.text", "Camilo Andrés Rojas Benavides")
        .and("contain.text", "SOL-");
      cy.get('[data-prueba="suma"]')
        .invoke("text")
        .should("match", /\$\s8\.650\.000/);
      cy.contains("5 archivos verificados").should("exist");
      cy.get('[data-prueba="evidencia"]').should("have.length", 5);
      cy.get('[data-prueba="evidencia"]')
        .last()
        .should("not.contain.text", "Geoetiquetada");
      cy.get('[data-prueba="verificaciones"] li').should("have.length", 3);
      cy.get('[data-prueba="tiempo-restante"] time')
        .invoke("text")
        .should("match", /\d+ h \d+ min|\d+ d \d+ h \d+ min|Vencido/);
      cy.get('[data-prueba="derivar"]').should(
        "have.attr",
        "href",
        "/operador/siniestros/sin-01/derivar",
      );
      cy.get('[data-prueba="rechazar"]').should("not.be.disabled");
      cy.get('[data-prueba="aprobar"]').should("not.be.disabled");
    });
  });

  it("aprobar lleva a la confirmación", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-01");
    cy.get('[data-prueba="aprobar"]').click();
    cy.location("pathname").should(
      "eq",
      "/operador/siniestros/sin-01/aprobado",
    );
  });

  it("derivado: perito asignado y Derivar deshabilitado", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-04");
    cy.get('[data-prueba="perito"]').should(
      "contain.text",
      "Peritazgos Antioquia & Cía. · Medellín · Red Preferente Noroccidente",
    );
    cy.get('[data-prueba="derivar"]').should("be.disabled");
    cy.get('[data-prueba="aprobar"]').should("not.be.disabled");
  });

  it("rechazado: solo lectura con motivo y verificación que no cumple", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-09");
    cy.get('[data-prueba="acciones"]').should("not.exist");
    cy.get('[data-prueba="resolucion"]').should(
      "contain.text",
      "Póliza no vigente",
    );
    cy.get('[data-prueba="verificaciones"]').should(
      "contain.text",
      "· No cumple",
    );
  });

  it("aprobado: solo lectura con indemnización", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-05");
    cy.get('[data-prueba="resolucion"]').should(
      "contain.text",
      "Indemnización",
    );
    cy.get('[data-prueba="tiempo-restante"]').should("not.exist");
  });

  it("id inexistente: no encontrado con regreso a la bandeja", () => {
    visitarComo("BACKOFFICE", "/operador/siniestros/sin-99");
    cy.contains("No encontramos este siniestro.").should("exist");
    cy.contains("a", "Volver a la bandeja").click();
    cy.location("pathname").should("eq", "/operador/siniestros");
  });
});
