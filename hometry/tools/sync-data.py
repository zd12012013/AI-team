#!/usr/bin/env python3
"""
Синхронизирует data/objects.json и data/topics.json -> data/data-fallback.js

Зачем: если открыть index.html двойным кликом (адрес file://...), браузер
запрещает fetch() локальных JSON-файлов. Тогда сайт берёт данные из
data-fallback.js, который подключается обычным <script>.

ЗАПУСКАЙ ПОСЛЕ КАЖДОЙ ПРАВКИ JSON:
    python3 tools/sync-data.py

Скрипт также проверяет данные (нет ли фактов без источника и т.п.).
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SUBJECTS = {"history", "physics", "chemistry", "biology", "geography", "math", "literature"}
BADGES = {"fact", "analogy"}


def check_objects(objects):
    problems = []
    for o in objects["objects"]:
        for key in ("id", "name", "emoji", "topics"):
            if key not in o:
                problems.append(f"{o.get('id', '?')}: нет поля «{key}»")
        for subj, t in o.get("topics", {}).items():
            where = f"{o['id']}/{subj}"
            if subj not in SUBJECTS:
                problems.append(f"{where}: неизвестный предмет")
            for mode in ("direct", "unexpected"):
                r = t.get(mode)
                if not r:
                    problems.append(f"{where}: нет режима {mode}")
                    continue
                if r.get("badge") not in BADGES:
                    problems.append(f"{where}/{mode}: badge должен быть fact или analogy")
                if r.get("badge") == "fact" and not r.get("source"):
                    problems.append(f"{where}/{mode}: у факта нет источника")
                if len(r.get("chain", [])) < 3:
                    problems.append(f"{where}/{mode}: в цепочке меньше 3 шагов")
            c = t.get("challenge")
            if not c:
                problems.append(f"{where}: нет режима challenge")
            elif c.get("badge") == "fact" and not c.get("source"):
                problems.append(f"{where}/challenge: у факта нет источника")
            for q in t.get("quiz", []):
                if not (0 <= q.get("answer", -1) < len(q.get("options", []))):
                    problems.append(f"{where}/quiz: неверный индекс ответа")
    return problems


def check_topics(topics):
    problems = []
    for t in topics["topics"]:
        where = t.get("id", "?")
        if t.get("subject") not in SUBJECTS:
            problems.append(f"{where}: неизвестный предмет")
        if not t.get("source"):
            problems.append(f"{where}: нет источника")
        if len(t.get("findAtHome", [])) != 3:
            problems.append(f"{where}: в «Найди дома» должно быть 3 предмета")
        if len(t.get("quiz", [])) != 3:
            problems.append(f"{where}: должно быть 3 вопроса")
    return problems


def main():
    objects = json.loads((DATA / "objects.json").read_text(encoding="utf-8"))
    topics = json.loads((DATA / "topics.json").read_text(encoding="utf-8"))
    problems = check_objects(objects) + check_topics(topics)
    if problems:
        print("Найдены проблемы в данных:")
        for p in problems:
            print("  -", p)
        sys.exit(1)
    js = (
        "// АВТОМАТИЧЕСКИ СОЗДАННЫЙ ФАЙЛ — не редактируй руками!\n"
        "// Источник: data/objects.json и data/topics.json.\n"
        "// Обновить: python3 tools/sync-data.py\n"
        "window.HOMETRY_FALLBACK = "
        + json.dumps({"objects": objects, "topics": topics}, ensure_ascii=False)
        + ";\n"
    )
    (DATA / "data-fallback.js").write_text(js, encoding="utf-8")
    print(f"OK: {len(objects['objects'])} предметов, {len(topics['topics'])} тем → data/data-fallback.js")


if __name__ == "__main__":
    main()
