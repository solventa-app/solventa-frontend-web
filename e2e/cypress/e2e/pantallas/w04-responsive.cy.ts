import { describeConMocks } from "../../support/entorno";
import { visitarComo } from "../../support/sesion";

// Responsive de HU-W04 (KAN-27): en 375, 768 y 1280 px la página no tiene scroll horizontal (la tabla puede
// tener el suyo) y el header y el footer siguen a la vista tras hacer scroll en el <main>. Deja capturas.
// Los altos caben en la ventana headless (1280x720) para que la captura no salga escalada ni con barras del runner.
const ANCHOS: [number, number][] = [
  [375, 667],
  [768, 680],
  [1280, 660],
];

function comprobar(pantalla: string, nombre: string) {
  cy.get(`[data-pantalla="${pantalla}"]`).should("exist");
  cy.contains(/Cargando/).should("not.exist");
  cy.document().then((doc) => {
    cy.window().then((win) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
    });
  });
  cy.screenshot(`${nombre}-arriba`, { capture: "viewport" });
  cy.get("main").scrollTo("bottom", { ensureScrollable: false });
  cy.get("header").first().should("be.visible");
  cy.get("footer").first().should("be.visible");
  cy.window().its("scrollY").should("eq", 0);
  cy.screenshot(`${nombre}-abajo`, { capture: "viewport" });
}

describeConMocks("HU-W04 · Responsive", () => {
  beforeEach(() => {
    cy.request("POST", "/graphql/siniestros/control/reiniciar");
  });

  ANCHOS.forEach(([ancho, alto]) => {
    describe(`${ancho} px`, () => {
      beforeEach(() => cy.viewport(ancho, alto));

      it("W04-01 bandeja", () => {
        visitarComo("BACKOFFICE", "/operador/siniestros");
        cy.get("table tbody tr").should("have.length", 10);
        comprobar("W04-01", `w04-01-${ancho}`);
      });

      it("W04-02 detalle pendiente (sin-01) y en revisión (sin-04)", () => {
        visitarComo("BACKOFFICE", "/operador/siniestros/sin-01");
        cy.get("h1").should("exist");
        comprobar("W04-02", `w04-02-sin01-${ancho}`);
        visitarComo("BACKOFFICE", "/operador/siniestros/sin-04");
        cy.get("h1").should("exist");
        comprobar("W04-02", `w04-02-sin04-${ancho}`);
      });

      it("W04-02b derivar (sin-03) y W04-03c confirmación", () => {
        visitarComo("BACKOFFICE", "/operador/siniestros/sin-03/derivar");
        cy.get('[data-prueba="perito"] select').should("exist");
        comprobar("W04-02b", `w04-02b-${ancho}`);
        cy.get('[data-prueba="perito"] select').select("per-03");
        cy.get('[data-prueba="confirmar"]').click();
        cy.get('[data-prueba="confirmacion"]').should("exist");
        comprobar("W04-03c", `w04-03c-${ancho}`);
      });

      it("W04-03a confirmación de aprobación (sin-01)", () => {
        visitarComo("BACKOFFICE", "/operador/siniestros/sin-01");
        cy.get('[data-prueba="aprobar"]').click();
        cy.get('[data-prueba="panel"]').should("exist");
        comprobar("W04-03a", `w04-03a-${ancho}`);
      });

      it("modal de rechazo y W04-03b confirmación (sin-06)", () => {
        visitarComo("BACKOFFICE", "/operador/siniestros/sin-06");
        cy.get('[data-prueba="rechazar"]').click();
        cy.get('[data-componente="modal-rechazo"]').should("be.visible");
        cy.get('[data-componente="modal-rechazo"]').then(($caja) => {
          const caja = $caja[0].getBoundingClientRect();
          cy.window().then((win) => {
            expect(caja.left).to.be.at.least(0);
            expect(caja.right).to.be.at.most(win.innerWidth);
          });
        });
        cy.screenshot(`modal-rechazo-${ancho}`, { capture: "viewport" });
        cy.get('[data-componente="modal-rechazo"]').within(() => {
          cy.get("select").select("FUERA_DE_COBERTURA");
          cy.get('[data-prueba="confirmar-rechazo"]').click();
        });
        cy.get('[data-prueba="panel"]').should("exist");
        comprobar("W04-03b", `w04-03b-${ancho}`);
      });
    });
  });
});
