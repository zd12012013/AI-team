#!/usr/bin/env bash
# Готовит видео к разбору: параметры + кадры + контактные листы (раскадровки).
#
# Использование:
#   bash scripts/prep.sh videos/forehand.mp4        # 6 кадров в секунду
#   bash scripts/prep.sh videos/forehand.mp4 12     # 12 кадров в секунду
set -euo pipefail

VIDEO="${1:-}"
FPS="${2:-6}"
PER_SHEET=36          # кадров на одном контактном листе (сетка 6x6)

if [ -z "$VIDEO" ]; then
  echo "Использование: bash scripts/prep.sh videos/ИМЯ.mp4 [fps]" >&2
  exit 1
fi

if [ ! -f "$VIDEO" ]; then
  echo "❌ Нет такого файла: $VIDEO" >&2
  echo "   Что лежит в videos/:" >&2
  ls -1 videos/ 2>/dev/null | grep -v '^README' >&2 || echo "   (пусто)" >&2
  exit 1
fi

for tool in ffprobe ffmpeg montage; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "❌ Нет $tool. Запусти сначала: bash scripts/setup.sh" >&2
    exit 1
  }
done

NAME="$(basename "${VIDEO%.*}")"
OUT="frames/$NAME"

echo "🎬 Видео: $VIDEO"
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,duration,nb_frames \
  -of default=noprint_wrappers=1 "$VIDEO"

rm -rf "$OUT"
mkdir -p "$OUT"

echo
echo "🖼  Раскладываю на кадры ($FPS в секунду)..."
ffmpeg -y -loglevel error -i "$VIDEO" -vf "fps=$FPS" -q:v 3 "$OUT/f_%03d.jpg"

COUNT=$(find "$OUT" -maxdepth 1 -name 'f_*.jpg' | wc -l)
echo "   Получилось кадров: $COUNT"

if [ "$COUNT" -eq 0 ]; then
  echo "❌ Кадры не извлеклись — возможно, файл повреждён или это не видео." >&2
  exit 1
fi

echo
echo "📑 Собираю раскадровки по $PER_SHEET кадров..."

mapfile -t FRAMES < <(find "$OUT" -maxdepth 1 -name 'f_*.jpg' | sort)

page=1
for ((i = 0; i < ${#FRAMES[@]}; i += PER_SHEET)); do
  sheet=$(printf "%s/sheet_%02d.jpg" "$OUT" "$page")
  # Подписываем каждый кадр его номером — чтобы можно было сослаться на f_042
  # -label/-pointsize задаются ДО картинок: в ImageMagick это настройки,
  # которые применяются к изображениям, прочитанным после них.
  montage -label '%t' -pointsize 18 -fill white -background black \
    "${FRAMES[@]:i:PER_SHEET}" \
    -tile 6x -geometry 320x180+4+4 "$sheet"
  echo "   → $sheet"
  page=$((page + 1))
done

echo
echo "✅ Готово. Дальше:"
echo "   1) посмотри $OUT/sheet_*.jpg целиком"
echo "   2) укрупни ключевые кадры: bash scripts/zoom.sh $OUT/f_001.jpg"
