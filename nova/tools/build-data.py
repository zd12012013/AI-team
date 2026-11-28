#!/usr/bin/env python3
"""
Проверка и сборка данных NOVA.

Источник данных — файлы data/<предмет>.json (их дописывает команда).
Скрипт:
  1) проверяет каждый файл (структура, ≥3 вопросов на уровень, верный индекс ответа…);
  2) собирает оглавление data/index.json (какие классы готовы и сколько в них тем);
  3) делает копии data/js/<имя>.js — они нужны, когда index.html открыт
     двойным кликом (file://), потому что браузер запрещает fetch локальных JSON.

ЗАПУСКАЙ ПОСЛЕ КАЖДОЙ ПРАВКИ JSON:
    python3 tools/build-data.py
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT_JS = DATA / "js"

# Классы по типовым учебным программам РК (должны совпадать с SUBJECTS в index.html)
GRADES = {
    "math": [5, 6],
    "algebra": [7, 8, 9, 10, 11],
    "geometry": [7, 8, 9, 10, 11],
    "physics": [7, 8, 9, 10, 11],
    "chemistry": [7, 8, 9, 10, 11],
    "biology": [7, 8, 9, 10, 11],
    "geography": [7, 8, 9, 10, 11],
    "informatics": [5, 6, 7, 8, 9, 10, 11],
    "english": [5, 6, 7, 8, 9, 10, 11],
    "history_kz": [5, 6, 7, 8, 9, 10, 11],
}
LEVELS = ["easy", "medium", "hard", "olympiad"]
MIN_QUESTIONS = 3


def check_subject(sid, data):
    errors, stats = [], {"topics": 0, "questions": 0, "check": 0, "kz": 0, "olymp": 0, "olymp_real": 0}
    if data.get("id") != sid:
        errors.append(f"поле id должно быть «{sid}»")
    ids = set()
    for grade, cls in data.get("classes", {}).items():
        if int(grade) not in GRADES[sid]:
            errors.append(f"{grade} класс: этого класса нет в программе предмета")
        for sec in cls.get("sections", []):
            if not sec.get("title"):
                errors.append(f"{grade} класс: у раздела нет title")
            for t in sec.get("topics", []):
                where = f"{grade} кл / {t.get('id', '?')}"
                stats["topics"] += 1
                stats["check"] += 1 if t.get("check") else 0
                stats["kz"] += 1 if t.get("kz") else 0
                if t.get("id") in ids:
                    errors.append(f"{where}: повторяющийся id темы")
                ids.add(t.get("id"))
                for key in ("id", "title", "explain", "levels"):
                    if not t.get(key):
                        errors.append(f"{where}: нет поля «{key}»")
                for lv in LEVELS:
                    qs = t.get("levels", {}).get(lv, [])
                    if len(qs) < MIN_QUESTIONS:
                        errors.append(f"{where}: на уровне {lv} {len(qs)} вопр. (нужно ≥{MIN_QUESTIONS})")
                    for n, q in enumerate(qs, 1):
                        stats["questions"] += 1
                        if "source" in q:
                            stats["olymp"] += 1
                            stats["olymp_real"] += 1 if q["source"] != "style" else 0
                        o = q.get("o", [])
                        a = q.get("a", 0)
                        if not q.get("q") or not q.get("e"):
                            errors.append(f"{where}/{lv}#{n}: нужен текст вопроса (q) и пояснение (e)")
                        if "answer" in q:            # задача с вводом ответа
                            if o:
                                errors.append(f"{where}/{lv}#{n}: у задачи с вводом (answer) не должно быть вариантов o")
                        elif len(o) < 2 or not (0 <= a < len(o)):
                            errors.append(f"{where}/{lv}#{n}: нужны варианты (o) и верный индекс ответа (a) или поле answer")
                        if len(set(map(str.strip, o))) != len(o):
                            errors.append(f"{where}/{lv}#{n}: повторяются варианты ответа")
                        if "source" in q:            # олимпиадная задача нового формата
                            src = q["source"]
                            if src != "style" and not (isinstance(src, dict) and src.get("name") and src.get("year")):
                                errors.append(f"{where}/{lv}#{n}: source — «style» или {{name, year, stage, grade, problem}}")
                            if src == "style" and not q.get("check"):
                                errors.append(f"{where}/{lv}#{n}: задача «в стиле олимпиады» должна иметь check: true")
                            if not (1 <= len(q.get("hints", [])) <= 2):
                                errors.append(f"{where}/{lv}#{n}: нужно 1–2 подсказки (hints)")
                            if not q.get("solution"):
                                errors.append(f"{where}/{lv}#{n}: нужно полное решение (solution)")
                        kz = q.get("kz")
                        if kz:
                            if o and len(kz.get("o", [])) != len(o):
                                errors.append(f"{where}/{lv}#{n}: в kz.o должно быть столько же вариантов, сколько в o")
                            if not kz.get("q"):
                                errors.append(f"{where}/{lv}#{n}: в kz нет текста вопроса (q)")
    return errors, stats


def main():
    OUT_JS.mkdir(exist_ok=True)
    index, all_errors = {}, []
    for sid in GRADES:
        path = DATA / f"{sid}.json"
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        errors, stats = check_subject(sid, data)
        all_errors += [f"{sid}: {e}" for e in errors]
        index[sid] = {
            "grades": {g: sum(len(s["topics"]) for s in c["sections"]) for g, c in data["classes"].items()},
            "topics": stats["topics"], "questions": stats["questions"], "check": stats["check"], "kz": stats["kz"],
        }
        (OUT_JS / f"{sid}.js").write_text(
            "// АВТОМАТИЧЕСКИ СОЗДАННЫЙ ФАЙЛ — не редактируй! Источник: data/%s.json\n"
            "(window.NOVA_DATA = window.NOVA_DATA || {})[%s] = %s;\n"
            % (sid, json.dumps(sid), json.dumps(data, ensure_ascii=False)), encoding="utf-8")
        print(f"  {sid:12} классов: {len(data['classes'])}, тем: {stats['topics']}, "
              f"вопросов: {stats['questions']}, на проверку: {stats['check']}, на казахском: {stats['kz']}, "
              f"олимп. задач: {stats['olymp']} (с реальным источником: {stats['olymp_real']})")
    if all_errors:
        print("\nОШИБКИ В ДАННЫХ:")
        for e in all_errors:
            print("  -", e)
        sys.exit(1)
    (DATA / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT_JS / "index.js").write_text(
        "// АВТОМАТИЧЕСКИ СОЗДАННЫЙ ФАЙЛ — не редактируй! Источник: data/index.json\n"
        "(window.NOVA_DATA = window.NOVA_DATA || {}).index = %s;\n" % json.dumps(index, ensure_ascii=False),
        encoding="utf-8")
    print(f"OK: предметов готово — {len(index)}")


if __name__ == "__main__":
    main()
