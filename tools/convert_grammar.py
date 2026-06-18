import json
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_FILE = BASE_DIR / "grammar_input.xlsx"
OUTPUT_FILE = BASE_DIR / "data" / "grammar.json"

SHEET_CONFIG = {
    "sostantivi": {
        "type": "noun",
        "base_columns": [
            "id",
            "base",
            "italian",
            "gender",
            "category",
            "active",
            "note",
        ],
        "extra_columns": [
            "gender",
        ],
        "form_columns": [
            "nom_sg",
            "gen_sg",
            "dat_sg",
            "acc_sg",
            "instr_sg",
            "prep_sg",
            "nom_pl",
            "gen_pl",
            "dat_pl",
            "acc_pl",
            "instr_pl",
            "prep_pl",
        ],
    },
    "verbi": {
        "type": "verb",
        "base_columns": [
            "id",
            "base",
            "italian",
            "aspect",
            "category",
            "active",
            "note",
        ],
        "extra_columns": [
            "aspect",
        ],
        "form_columns": [
            "present_1sg",
            "present_2sg",
            "present_3sg",
            "present_1pl",
            "present_2pl",
            "present_3pl",
            "future_1sg",
            "future_2sg",
            "future_3sg",
            "future_1pl",
            "future_2pl",
            "future_3pl",
            "past_m",
            "past_f",
            "past_n",
            "past_pl",
            "imperative_sg",
            "imperative_pl",
        ],
    },
}


def clean_value(value):
    """
    Converte NaN/None in stringa vuota e ripulisce gli spazi.
    Mantiene tutto come stringa, tranne active che viene gestito separatamente.
    """
    if pd.isna(value):
        return ""

    value = str(value).strip()

    # Normalizza spazi multipli interni, utile per forme tipo "буду читать"
    value = " ".join(value.split())

    return value


def parse_active(value):
    """
    Converte il campo active in booleano.
    Accetta varianti comode da Excel.
    """
    value = clean_value(value).lower()

    if value in {"sì", "si", "yes", "y", "true", "1", "attivo"}:
        return True

    if value in {"no", "n", "false", "0", "inattivo"}:
        return False

    # Default prudente: se manca active, la parola non viene attivata.
    return False


def normalize_columns(df):
    """
    Normalizza i nomi delle colonne:
    - rimuove spazi;
    - porta in minuscolo;
    - sostituisce spazi con underscore.
    """
    df = df.copy()
    df.columns = [
        str(col).strip().lower().replace(" ", "_")
        for col in df.columns
    ]
    return df


def validate_columns(df, sheet_name, config):
    required_columns = set(config["base_columns"] + config["form_columns"])
    existing_columns = set(df.columns)

    missing = sorted(required_columns - existing_columns)

    if missing:
        raise ValueError(
            f"Nel foglio '{sheet_name}' mancano queste colonne: {missing}"
        )


def row_has_minimum_data(row):
    """
    Una riga è valida solo se ha almeno id e base.
    """
    return bool(clean_value(row.get("id", ""))) and bool(clean_value(row.get("base", "")))


def build_item(row, config):
    item_type = config["type"]

    item = {
        "id": clean_value(row.get("id", "")),
        "type": item_type,
        "base": clean_value(row.get("base", "")),
        "italian": clean_value(row.get("italian", "")),
        "category": clean_value(row.get("category", "")) or "base",
        "active": parse_active(row.get("active", "")),
        "note": clean_value(row.get("note", "")),
        "extra": {},
        "forms": {},
    }

    for col in config["extra_columns"]:
        item["extra"][col] = clean_value(row.get(col, ""))

    for col in config["form_columns"]:
        value = clean_value(row.get(col, ""))

        # Salva solo forme non vuote.
        # Le forme vuote non genereranno esercizi.
        if value:
            item["forms"][col] = value

    return item


def check_duplicate_ids(items):
    seen = set()
    duplicates = []

    for item in items:
        item_id = item["id"]

        if item_id in seen:
            duplicates.append(item_id)
        else:
            seen.add(item_id)

    if duplicates:
        raise ValueError(f"ID duplicati trovati: {sorted(set(duplicates))}")


def load_sheet(excel_file, sheet_name, config):
    df = pd.read_excel(excel_file, sheet_name=sheet_name, dtype=str)
    df = normalize_columns(df)

    validate_columns(df, sheet_name, config)

    items = []

    for _, row in df.iterrows():
        if not row_has_minimum_data(row):
            continue

        item = build_item(row, config)
        items.append(item)

    return items


def build_form_labels():
    return {
        # Sostantivi
        "nom_sg": "nominativo singolare",
        "gen_sg": "genitivo singolare",
        "dat_sg": "dativo singolare",
        "acc_sg": "accusativo singolare",
        "instr_sg": "strumentale singolare",
        "prep_sg": "prepositivo singolare",

        "nom_pl": "nominativo plurale",
        "gen_pl": "genitivo plurale",
        "dat_pl": "dativo plurale",
        "acc_pl": "accusativo plurale",
        "instr_pl": "strumentale plurale",
        "prep_pl": "prepositivo plurale",

        # Verbi: presente
        "present_1sg": "presente, 1ª singolare",
        "present_2sg": "presente, 2ª singolare",
        "present_3sg": "presente, 3ª singolare",
        "present_1pl": "presente, 1ª plurale",
        "present_2pl": "presente, 2ª plurale",
        "present_3pl": "presente, 3ª plurale",

        # Verbi: futuro
        "future_1sg": "futuro, 1ª singolare",
        "future_2sg": "futuro, 2ª singolare",
        "future_3sg": "futuro, 3ª singolare",
        "future_1pl": "futuro, 1ª plurale",
        "future_2pl": "futuro, 2ª plurale",
        "future_3pl": "futuro, 3ª plurale",

        # Verbi: passato
        "past_m": "passato maschile",
        "past_f": "passato femminile",
        "past_n": "passato neutro",
        "past_pl": "passato plurale",

        # Verbi: imperativo
        "imperative_sg": "imperativo singolare",
        "imperative_pl": "imperativo plurale",
    }


def build_type_labels():
    return {
        "noun": "sostantivo",
        "verb": "verbo",
        "adjective": "aggettivo",
    }


def write_json_output(items, output_file):
    data = {
        "items": items,
        "formLabels": build_form_labels(),
        "typeLabels": build_type_labels(),
    }

    output_file.parent.mkdir(parents=True, exist_ok=True)

    output_file.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

def main():
    input_path = Path(INPUT_FILE)

    if not input_path.exists():
        raise FileNotFoundError(f"File non trovato: {INPUT_FILE}")

    all_items = []

    excel = pd.ExcelFile(input_path)

    for sheet_name, config in SHEET_CONFIG.items():
        if sheet_name not in excel.sheet_names:
            print(f"Foglio '{sheet_name}' non trovato: saltato.")
            continue

        print(f"Lettura foglio: {sheet_name}")
        items = load_sheet(input_path, sheet_name, config)
        all_items.extend(items)

    check_duplicate_ids(all_items)

    write_json_output(all_items, OUTPUT_FILE)

    active_count = sum(1 for item in all_items if item["active"])
    inactive_count = len(all_items) - active_count
    
    print()
    print(f"Creato file: {OUTPUT_FILE}")
    print(f"Elementi totali: {len(all_items)}")
    print(f"Attivi: {active_count}")
    print(f"Inattivi: {inactive_count}")


if __name__ == "__main__":
    main()