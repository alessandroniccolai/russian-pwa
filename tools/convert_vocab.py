import json
from pathlib import Path

import pandas as pd


# Percorsi
BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_FILE = BASE_DIR / "vocaboli.xlsx"
OUTPUT_FILE = BASE_DIR / "data" / "vocab.json"

SHEET_NAME = "vocaboli"


REQUIRED_COLUMNS = [
    "id",
    "russo",
    "italiano",
    "tipo",
    "categoria",
    "attivo",
]

OPTIONAL_COLUMNS = [
    "categorie_extra",
    "prompt_it",
    "prompt_ru",
]


def clean_text(value):
    """
    Converte valori NaN in stringa vuota
    e rimuove spazi iniziali/finali.
    """
    if pd.isna(value):
        return ""
    return str(value).strip()


def parse_active(value):
    """
    Interpreta il campo 'attivo'.

    Valori considerati attivi:
    - 1
    - "1"
    - "true"
    - "vero"
    - "yes"
    - "sì"
    - "si"
    """
    if pd.isna(value):
        return False

    value = str(value).strip().lower()

    return value in ["1", "true", "vero", "yes", "sì", "si"]


def parse_categories(main_category, extra_categories):
    """
    Converte categoria + categorie_extra in lista.

    Esempio:
    categoria = "cibo"
    categorie_extra = "viaggio; vita quotidiana"

    Risultato:
    ["cibo", "viaggio", "vita quotidiana"]
    """
    categories = []

    main_category = clean_text(main_category)
    extra_categories = clean_text(extra_categories)

    if main_category:
        categories.append(main_category)

    if extra_categories:
        extras = extra_categories.split(";")
        for item in extras:
            item = clean_text(item)
            if item and item not in categories:
                categories.append(item)

    return categories


def validate_columns(df):
    """
    Controlla che le colonne obbligatorie esistano.
    """
    missing = []

    for column in REQUIRED_COLUMNS:
        if column not in df.columns:
            missing.append(column)

    if missing:
        raise ValueError(
            "Colonne obbligatorie mancanti nel file Excel: "
            + ", ".join(missing)
        )


def validate_required_fields(row, row_number):
    """
    Controlla che i campi obbligatori non siano vuoti.
    """
    errors = []

    for column in REQUIRED_COLUMNS:
        if column == "attivo":
            continue

        value = clean_text(row.get(column, ""))

        if not value:
            errors.append(column)

    if errors:
        raise ValueError(
            f"Riga Excel {row_number}: campi obbligatori vuoti: "
            + ", ".join(errors)
        )


def convert_excel_to_json():
    """
    Legge vocaboli.xlsx e crea data/vocab.json.
    """
    if not INPUT_FILE.exists():
        raise FileNotFoundError(f"File non trovato: {INPUT_FILE}")

    df = pd.read_excel(INPUT_FILE, sheet_name=SHEET_NAME)

    validate_columns(df)

    vocab_items = []
    seen_ids = set()

    for index, row in df.iterrows():
        row_number = index + 2  # +2 perché Excel ha intestazione alla riga 1

        active = parse_active(row.get("attivo", ""))

        if not active:
            continue

        validate_required_fields(row, row_number)

        item_id = clean_text(row["id"])

        if item_id in seen_ids:
            raise ValueError(f"ID duplicato alla riga Excel {row_number}: {item_id}")

        seen_ids.add(item_id)

        ru = clean_text(row["russo"])
        it = clean_text(row["italiano"])
        word_type = clean_text(row["tipo"])

        categories = parse_categories(
            row.get("categoria", ""),
            row.get("categorie_extra", "")
        )

        prompt_it = clean_text(row.get("prompt_it", ""))
        prompt_ru = clean_text(row.get("prompt_ru", ""))

        item = {
            "id": item_id,
            "ru": ru,
            "it": it,
            "type": word_type,
            "categories": categories,
            "prompt": {
                "it": prompt_it,
                "ru": prompt_ru,
            },
            "active": active,
        }

        vocab_items.append(item)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(vocab_items, f, ensure_ascii=False, indent=2)

    print(f"Conversione completata.")
    print(f"Vocaboli esportati: {len(vocab_items)}")
    print(f"File creato: {OUTPUT_FILE}")


if __name__ == "__main__":
    convert_excel_to_json()