#!/usr/bin/env python3
"""Проверка кода C++ в data/informatics.json: python3 tools/check-cpp.py

Примеры тем (topic.examples): компилируются и запускаются, вывод сверяется с полем out
(вход — поле in, если есть).

Вопросы с полем code:
  wrap: "main" — фрагмент оборачивается в int main() { … }, "top" — свои функции + main,
        "full" — полная программа;
  test: "out"           — вывод совпадает с верным вариантом (o[a]);
        "fill"          — верный вариант подставляется вместо ___, вывод совпадает с expect;
        "compile_error" — код НЕ должен компилироваться;
        "none"          — не запускается (бесконечный цикл, выход за границы).
Олимпиадные задачи с полем tests: [{in, out}] — решение (solution_code) прогоняется на тестах.
"""
import json, pathlib, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parent.parent
HEAD = "#include <bits/stdc++.h>\nusing namespace std;\n"


def build(code, wrap):
    if wrap == "full":
        return code
    if wrap == "top":
        return HEAD + code + "\n"
    return HEAD + "int main() {\n" + code + "\n    return 0;\n}\n"


def run(src, stdin=""):
    with tempfile.TemporaryDirectory() as d:
        p = pathlib.Path(d)
        (p / "a.cpp").write_text(src, encoding="utf-8")
        c = subprocess.run(["g++", "-std=c++17", "-O1", "-o", str(p / "a"), str(p / "a.cpp")], capture_output=True, text=True)
        if c.returncode:
            return None, c.stderr
        r = subprocess.run([str(p / "a")], input=stdin, capture_output=True, text=True, timeout=5)
        return r.stdout, r.stderr


norm = lambda s: "\n".join(line.rstrip() for line in (s or "").strip().splitlines())


def jobs(data):
    for g, cls in data["classes"].items():
        for sec in cls["sections"]:
            for t in sec["topics"]:
                for i, ex in enumerate(t.get("examples", [])):
                    yield (f"{t['id']} пример {i + 1}", ex["code"], "full", "out", norm(ex["out"]), ex.get("in", ""))
                for lvl, qs in t["levels"].items():
                    for k, q in enumerate(qs):
                        name = f"{t['id']} {lvl} #{k + 1}"
                        for j, tc in enumerate(q.get("tests", [])):
                            yield (f"{name} тест {j + 1}", q["solution_code"], "full", "out", norm(tc["out"]), tc["in"])
                        if "code" not in q or q.get("test") == "none":
                            continue
                        test, wrap = q.get("test", "out"), q.get("wrap", "main")
                        right = q["o"][q.get("a", 0)] if "o" in q else q.get("answer", "")
                        if test == "out":
                            yield (name, q["code"], wrap, "out", norm(right), "")
                        elif test == "fill":
                            yield (name, q["code"].replace("___", right), wrap, "out", norm(q["expect"]), "")
                        elif test == "compile_error":
                            yield (name, q["code"], wrap, "compile_error", None, "")


def check(job):
    name, code, wrap, kind, want, stdin = job
    out, err = run(build(code, wrap), stdin)
    if kind == "compile_error":
        return None if out is None else f"{name}: должен НЕ компилироваться, а скомпилировался"
    if out is None:
        return f"{name}: ошибка компиляции\n{err[:600]}"
    if norm(out) != want:
        return f"{name}: вывод {norm(out)!r}, а ожидался {want!r}"
    return None


def main():
    data = json.loads((ROOT / "data" / "informatics.json").read_text(encoding="utf-8"))
    js = list(jobs(data))
    with ThreadPoolExecutor(8) as ex:
        errors = [e for e in ex.map(check, js) if e]
    for e in errors:
        print("✗", e)
    print(f"Проверено программ: {len(js)}, ошибок: {len(errors)}")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
