#!/usr/bin/env bash
# Запускается в начале каждой сессии: напоминает контекст и состояние инструментов.
# Никогда не падает — если что-то не так, просто молчит.
set +e

echo "🏓 Проект: ИИ-команда по разбору настольного тенниса."

if command -v ffmpeg >/dev/null 2>&1 && command -v montage >/dev/null 2>&1; then
  echo "Инструменты: ffmpeg и montage на месте."
else
  echo "Инструменты: ffmpeg/montage НЕ установлены — перед разбором видео выполни 'bash scripts/setup.sh'."
fi

vids=$(ls -1 videos/ 2>/dev/null | grep -vi '^README' | head -10)
if [ -n "$vids" ]; then
  echo "Видео, ждущие разбора (videos/):"
  echo "$vids" | sed 's/^/  - /'
else
  echo "В videos/ пока пусто — новых видео нет."
fi

latest=$(ls -t reports/*.md 2>/dev/null | grep -v '_TEMPLATE' | head -3)
if [ -n "$latest" ]; then
  echo "Последние отчёты — ПРОЧИТАЙ их перед разбором, чтобы помнить прогресс:"
  echo "$latest" | sed 's/^/  - /'
else
  echo "Отчётов пока нет — это первый разбор."
fi

exit 0
