#!/usr/bin/env bash
# Ставит инструменты для разбора видео: ffmpeg (кадры) и imagemagick (раскадровки).
# Идемпотентный: если всё уже есть — выходит мгновенно.
set -euo pipefail

need=()
command -v ffmpeg  >/dev/null 2>&1 || need+=(ffmpeg)
command -v ffprobe >/dev/null 2>&1 || need+=(ffmpeg)
command -v montage >/dev/null 2>&1 || need+=(imagemagick)

if [ ${#need[@]} -eq 0 ]; then
  echo "✅ ffmpeg и imagemagick уже установлены."
  exit 0
fi

echo "📦 Ставлю: ${need[*]} (это займёт около минуты)..."

SUDO=""
[ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && SUDO="sudo"

$SUDO apt-get update -qq
$SUDO apt-get install -y --no-install-recommends ffmpeg imagemagick

echo "✅ Готово:"
ffmpeg -version | head -1
montage -version | head -1
