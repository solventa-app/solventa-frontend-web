#!/usr/bin/env python3
"""Genera el PDF de la guía de integración para socios (HU-W07, plan-hu-w07-front.md 5.5).

Toma docs/guia-integracion-socios.md (español) y docs/guia-integracion-socios.en.md (inglés), los convierte a HTML con la apariencia de la web (Inter y los colores de
apps/web/src/styles/twind.ts) e imprime un PDF por idioma con Chrome sin interfaz en apps/web/public/socios/, donde la pestaña
«Guía de integración» de W07-03 muestra el del idioma activo. Requisitos: python3 con `markdown` y google-chrome. Uso:

    python3 scripts/guia-pdf.py
"""

import subprocess
import tempfile
from pathlib import Path

import markdown

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
PUBLICO = RAIZ / "apps" / "web" / "public" / "socios"
# (fuente, PDF, idioma del documento, título de la pestaña del visor)
GUIAS = [
    ("guia-integracion-socios.md", "guia-integracion-es.pdf", "es", "Guía de integración para socios de distribución"),
    ("guia-integracion-socios.en.md", "guia-integracion-en.pdf", "en", "Integration guide for distribution partners"),
]
INTER = RAIZ / "apps" / "web" / "node_modules" / "@fontsource" / "inter" / "files"

CSS = """
@font-face { font-family: Inter; font-weight: 400; src: url('{inter}/inter-latin-400-normal.woff2'); }
@font-face { font-family: Inter; font-weight: 600; src: url('{inter}/inter-latin-600-normal.woff2'); }
@font-face { font-family: Inter; font-weight: 700; src: url('{inter}/inter-latin-700-normal.woff2'); }
@page { size: A4; margin: 18mm 16mm; }
body { font-family: Inter, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #333333; }
h1 { color: #ffffff; background: #1e4680; padding: 28px 24px; border-radius: 8px; font-size: 22pt; margin: 0 0 8px; }
h1 + p { color: #6e6e6e; margin-bottom: 18px; }
h2 { color: #1e4680; font-size: 15pt; border-bottom: 1px solid #d9d9d9; padding-bottom: 4px; margin-top: 26px;
     break-after: avoid; }
h2:not(:first-of-type) { break-before: auto; }
a { color: #2b5aa3; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; break-inside: avoid; }
th { background: #f6f3f2; text-align: left; }
th, td { border: 1px solid #d9d9d9; padding: 6px 8px; vertical-align: top; }
pre { background: #f5f5f5; border: 1px solid #d9d9d9; border-radius: 4px; padding: 10px; font-size: 8.5pt;
      white-space: pre-wrap; break-inside: avoid; }
code { font-family: 'Liberation Mono', monospace; font-size: 9pt; }
blockquote { margin: 10px 0; padding: 8px 12px; background: #e8eff9; border-left: 4px solid #2b5aa3; border-radius: 4px; }
img { max-width: 100%; border: 1px solid #d9d9d9; border-radius: 8px; margin: 8px 0; break-inside: avoid; }
li { margin: 2px 0; }
"""


def generar(fuente: Path, salida: Path, idioma: str, titulo: str) -> None:
    cuerpo = markdown.markdown(fuente.read_text(encoding="utf-8"), extensions=["tables", "fenced_code"])
    # Las casillas de la lista de verificación se ven como casillas, no como «[ ]».
    cuerpo = cuerpo.replace("[ ] ", "☐ ")
    html = (
        f'<!doctype html><html lang="{idioma}"><head><meta charset="utf-8">'
        f"<title>{titulo}</title>"
        f"<base href=\"{DOCS.as_uri()}/\"><style>{CSS.replace('{inter}', INTER.as_uri())}</style>"
        f"</head><body>{cuerpo}</body></html>"
    )
    PUBLICO.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        pagina = Path(tmp) / "guia.html"
        pagina.write_text(html, encoding="utf-8")
        subprocess.run(
            [
                "google-chrome",
                "--headless",
                "--disable-gpu",
                "--no-pdf-header-footer",
                "--allow-file-access-from-files",
                f"--print-to-pdf={salida}",
                pagina.as_uri(),
            ],
            check=True,
            capture_output=True,
        )
    print(f"PDF listo: {salida.relative_to(RAIZ)}")


def main() -> None:
    for fuente, pdf, idioma, titulo in GUIAS:
        generar(DOCS / fuente, PUBLICO / pdf, idioma, titulo)


if __name__ == "__main__":
    main()
