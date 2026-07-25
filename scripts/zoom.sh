#!/usr/bin/env bash
# Укрупняет кадр, чтобы разглядеть технику детально.
#
#   bash scripts/zoom.sh frames/ИМЯ/f_042.jpg           # центр, 2x
#   bash scripts/zoom.sh frames/ИМЯ/f_042.jpg left      # левая половина
#   bash scripts/zoom.sh frames/ИМЯ/f_042.jpg right     # правая половина
#   bash scripts/zoom.sh frames/ИМЯ/f_042.jpg top       # верхняя половина
#   bash scripts/zoom.sh frames/ИМЯ/f_042.jpg bottom    # нижняя (ноги!)
set -euo pipefail

FRAME="${1:-}"
PART="${2:-center}"

if [ -z "$FRAME" ] || [ ! -f "$FRAME" ]; then
  echo "Использование: bash scripts/zoom.sh frames/ИМЯ/f_042.jpg [center|left|right|top|bottom]" >&2
  exit 1
fi

command -v convert >/dev/null 2>&1 || {
  echo "❌ Нет imagemagick. Запусти: bash scripts/setup.sh" >&2
  exit 1
}

case "$PART" in
  center) GRAV=Center;    CROP="50%x50%" ;;
  left)   GRAV=West;      CROP="50%x100%" ;;
  right)  GRAV=East;      CROP="50%x100%" ;;
  top)    GRAV=North;     CROP="100%x50%" ;;
  bottom) GRAV=South;     CROP="100%x50%" ;;
  *) echo "❌ Неизвестная область: $PART (можно center|left|right|top|bottom)" >&2; exit 1 ;;
esac

DIR="$(dirname "$FRAME")/zoom"
BASE="$(basename "${FRAME%.*}")"
OUT="$DIR/${BASE}_${PART}.jpg"
mkdir -p "$DIR"

# Кроп в процентах от размера кадра, потом апскейл до ширины 1280 для читаемости
convert "$FRAME" -gravity "$GRAV" -crop "$CROP"+0+0 +repage \
  -resize 1280x -unsharp 0x1 "$OUT"

echo "→ $OUT"
