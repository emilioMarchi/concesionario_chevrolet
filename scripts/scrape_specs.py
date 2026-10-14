# -*- coding: utf-8 -*-
"""
Descarga las Fichas Técnicas (PDF) de cada modelo de chevrolet.com.ar
y las parsea a un JSON estructurado (scraped/specs.json).

Uso:  python scripts/scrape_specs.py
"""
import json
import os
import re
import sys
import unicodedata
import urllib.request
from urllib.parse import quote, urlsplit, urlunsplit

import pdfplumber

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

BASE = "https://www.chevrolet.com.ar"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36"

MODELS = [
    "/autos-0km/onix-auto-moderno",
    "/autos-0km/onix-plus",
    "/camionetas-pick-up/montana-pickup",
    "/camionetas-pick-up/s10",
    "/camionetas-pick-up/silverado-pickup",
    "/camionetas-suv/sonic",
    "/camionetas-suv/spin-auto-familiar",
    "/camionetas-suv/tracker-suv",
    "/camionetas-suv/trailblazer-camioneta-4x4",
]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FICHA_DIR = os.path.join(ROOT, "scraped", "fichas")
OUT = os.path.join(ROOT, "scraped", "specs.json")

SECTION_NAMES = [
    "GENERAL", "MOTOR", "MOTOR Y MECANICA", "MOTORIZACION", "MECANICA",
    "NEUMATICOS", "SEGURIDAD", "EXTERIOR", "INTERIOR", "INTERIOR COMFORT",
    "INTERIOR & COMFORT", "CONFORT", "COMFORT", "DIMENSIONES",
    "DIMENSIONES Y CAPACIDADES", "CAPACIDADES", "COLOR", "COLORES",
    "COLORES DISPONIBLES", "MULTIMEDIA", "TECNOLOGIA", "EQUIPAMIENTO",
]


def norm(s):
    s = (s or "").strip().upper().replace("&", " ")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^A-Z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


SECTION_SET = {norm(x) for x in SECTION_NAMES}


def is_section_name(label):
    return norm(label) in SECTION_SET


def get(url, binary=False):
    parts = urlsplit(url)
    safe_path = quote(parts.path, safe="/%")
    safe_query = quote(parts.query, safe="=&%")
    url = urlunsplit((parts.scheme, parts.netloc, safe_path, safe_query, parts.fragment))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else data.decode("utf-8", "replace")


def slugify(s):
    s = s.normalize("NFD")
    s = "".join(c for c in s if ord(c) < 128 or c.isalnum() or c in " -_")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "modelo"


def discover_ficha(model_path):
    """Devuelve la URL del PDF de Ficha Técnica (prefiere el año más alto)."""
    html = get(BASE + model_path)
    matches = re.findall(r'<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>([\s\S]*?)</a>', html, re.I)
    candidates = []
    for href, inner in matches:
        text = re.sub(r"<[^>]+>", " ", inner)
        text = re.sub(r"\s+", " ", text).strip()
        if "ficha" not in href.lower() and "ficha" not in text.lower():
            continue
        href = href.replace("&amp;", "&")
        if href.startswith("/"):
            href = BASE + href
        year = 0
        ym = re.search(r"my?(\d{2})|(20\d{2})", text + " " + href, re.I)
        if ym:
            raw = ym.group(1) or ym.group(2)
            year = int(raw) + 2000 if len(raw) == 2 else int(raw)
        candidates.append((year, href))
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0])
    return candidates[-1][1]


def boolean_cell(v):
    if v is None:
        return None
    t = str(v).strip().upper()
    if t in {"S", "SI", "SÍ", "YES", "●", "X", "✓", "✔", "TRUE"}:
        return True
    if t in {"-", "–", "—", "NO", "FALSE", ""}:
        return False
    return None


def describe_document(pdf_path):
    """Vuelca las tablas crudas del PDF (para depuración)."""
    with pdfplumber.open(pdf_path) as pdf:
        for pi, page in enumerate(pdf.pages):
            for ti, tab in enumerate(page.extract_tables() or []):
                print(f"--- page {pi} table {ti}: {len(tab)}x{len(tab[0]) if tab else 0}")
                for row in tab:
                    print("   ", row)


def parse_ficha(pdf_path):
    """Interpreta una ficha técnica. Devuelve trims, secciones y specs clave.

    Formatos soportados: cada sección es una tabla cuyo encabezado lleva los
    nombres de versión (trims); algunas fichas usan una sola columna (lista de
    features sin valores por versión)."""
    all_tables = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            all_tables.extend(page.extract_tables() or [])

    def clean(c):
        return "" if c is None else re.sub(r"\s+", " ", str(c).replace("\n", " ")).strip()

    trims = []
    sections = []
    current = None

    def ensure_section():
        nonlocal current
        if current is None:
            current = {"title": "GENERAL", "rows": []}
            sections.append(current)
        return current

    for tab in all_tables:
        for row in tab:
            cells = [clean(c) for c in row]
            if not any(cells):
                continue
            label = cells[0]
            rest = cells[1:]
            rest_non = [c for c in rest if c]

            is_model = bool(re.search(r"\bMY\s?\d{2}\b", label.upper()))
            if is_model:
                if len(rest_non) > len(trims):
                    trims = rest_non
                continue
            if label == "" and len(rest_non) >= 2 and all(len(c) <= 25 for c in rest_non):
                if len(rest_non) > len(trims):
                    trims = rest_non
                continue

            rest_ok = not rest_non or all(len(c) <= 25 for c in rest_non)
            looks_section = rest_ok and (
                not rest_non
                or len(rest_non) == len(trims)
                or (len(trims) == 0 and len(rest_non) >= 2)
            )
            if is_section_name(label) and looks_section:
                if rest_non and len(rest_non) > len(trims):
                    trims = rest_non
                current = {"title": label, "rows": []}
                sections.append(current)
                continue

            values = [c if c else None for c in rest]
            ensure_section()["rows"].append({"label": label, "values": values})

    sections = [s for s in sections if s["rows"]]
    merged = []
    for sec in sections:
        if merged and norm(merged[-1]["title"]) == norm(sec["title"]):
            merged[-1]["rows"].extend(sec["rows"])
        else:
            merged.append(sec)

    key_specs = extract_key_specs(merged)
    return {"trims": trims, "sections": merged, "keySpecs": key_specs}


BOOLISH = {"S", "SI", "SÍ", "YES", "●", "X", "✓", "✔", "TRUE", "-", "–", "—", "NO", "FALSE", ""}


def is_boolish(v):
    return (v or "").strip().upper() in BOOLISH


KEY_SPEC_PATTERNS = [
    ("motor", r"^motor(?:\s|$|\s?1|\s?\d)"),
    ("cilindrada", r"cilindrada"),
    ("cilindros", r"cilindros"),
    ("valvulas", r"v[aá]lvulas"),
    ("potencia", r"potencia"),
    ("torque", r"torque"),
    ("combustible", r"^combustible|tipo de combustible"),
    ("transmision", r"transmisi[oó]n"),
    ("traccion", r"^tracci[oó]n"),
    ("entreEjes", r"distancia entre ejes"),
    ("largo", r"^largo\b|^longitud"),
    ("ancho", r"^ancho\b"),
    ("altura", r"^altura\b|^alto\b"),
    ("despeje", r"despeje"),
    ("peso", r"^peso\b"),
    ("cargaUtil", r"carga [uú]til"),
    ("remolque", r"remolque"),
    ("tanque", r"tanque"),
    ("baul", r"ba[uú]l|volumen de caja|capacidad de caja"),
    ("plazas", r"plazas"),
    ("ruedas", r"^ruedas\b|^neum[aá]ticos\b"),
    ("llantas", r"^llantas\b"),
]


def extract_key_specs(sections):
    specs = {}
    for sec in sections:
        for row in sec["rows"]:
            label = row["label"]
            for key, pat in KEY_SPEC_PATTERNS:
                if key in specs or not re.search(pat, label.lower()):
                    continue
                vals = [v for v in row["values"] if v and not is_boolish(v)]
                if vals:
                    specs[key] = vals[0]
                break
    return specs


def main():
    os.makedirs(FICHA_DIR, exist_ok=True)
    result = {"source": BASE, "models": []}

    for mp in MODELS:
        slug = mp.split("/")[-1]
        print(f"- {mp}")
        try:
            url = discover_ficha(mp)
            if not url:
                print("   ! sin ficha técnica")
                result["models"].append({"id": slug, "url": BASE + mp, "ficha": None})
                continue
            ext = os.path.splitext(url.split("?")[0])[1] or ".pdf"
            dest = os.path.join(FICHA_DIR, slug + ext)
            if not os.path.exists(dest):
                with open(dest, "wb") as f:
                    f.write(get(url, binary=True))
            parsed = parse_ficha(dest)
            print(f"   OK {os.path.basename(url)} | trims={len(parsed['trims'])} secciones={len(parsed['sections'])}")
            result["models"].append({
                "id": slug,
                "url": BASE + mp,
                "fichaPdf": url,
                "localPdf": os.path.relpath(dest, ROOT).replace("\\", "/"),
                **parsed,
            })
        except Exception as e:  # noqa
            print(f"   ERROR {e}")
            result["models"].append({"id": slug, "url": BASE + mp, "error": str(e)})

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\nJSON: {OUT}")


if __name__ == "__main__":
    sys.exit(main())
