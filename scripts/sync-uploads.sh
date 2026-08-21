#!/usr/bin/env bash
#
# Lokaldeki yuklenen gorselleri prod sunucudaki uploads klasorune kopyalar.
#
# Neden gerekli: gorseller DB'de degil diskte duruyor. DB'deki image_url alani
# sadece "/uploads/<uuid>.jpg" gibi bir yol tutuyor. Veritabani dump'ini prod'a
# tasimak dosyalari TASIMAZ - dosya sunucuda yoksa her gorsel 404 olur.
#
# Kullanim:
#   ./scripts/sync-uploads.sh kullanici@sunucu                 # once dry-run yapar, onay ister
#   ./scripts/sync-uploads.sh kullanici@sunucu --yes           # onay sormadan
#   REMOTE_DIR=/baska/yol ./scripts/sync-uploads.sh kullanici@sunucu
#
# Silme YOK: --delete kullanilmiyor. Sunucuda panelden yuklenmis, lokalde
# olmayan dosyalar korunur. Tek yonlu ve toplayici (lokal -> prod).

set -euo pipefail

REMOTE="${1:-}"
CONFIRM="${2:-}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backend/static/uploads"
REMOTE_DIR="${REMOTE_DIR:-/var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads}"
# Backend container'i uid 10001 (appuser) ile calisiyor; panelden yeni dosya
# yazabilmesi icin klasorun sahibi o olmali.
OWNER="${OWNER:-10001:10001}"

if [[ -z "$REMOTE" ]]; then
    echo "Kullanim: $0 kullanici@sunucu [--yes]" >&2
    exit 1
fi

if [[ ! -d "$LOCAL_DIR" ]]; then
    echo "HATA: $LOCAL_DIR yok" >&2
    exit 1
fi

echo "Kaynak : $LOCAL_DIR  ($(find "$LOCAL_DIR" -type f | wc -l | tr -d ' ') dosya)"
echo "Hedef  : $REMOTE:$REMOTE_DIR"
echo

echo "--- dry-run (hicbir sey yazilmiyor) ---"
rsync -avz --dry-run --itemize-changes "$LOCAL_DIR"/ "$REMOTE:$REMOTE_DIR"/

if [[ "$CONFIRM" != "--yes" ]]; then
    echo
    read -r -p "Yukaridaki dosyalar kopyalansin mi? [e/H] " answer
    [[ "$answer" == "e" || "$answer" == "E" ]] || { echo "Iptal edildi."; exit 0; }
fi

echo
echo "--- kopyalaniyor ---"
rsync -avz "$LOCAL_DIR"/ "$REMOTE:$REMOTE_DIR"/

echo
echo "--- sahiplik ayarlaniyor ($OWNER) ---"
ssh "$REMOTE" "sudo chown -R $OWNER '$REMOTE_DIR' && ls '$REMOTE_DIR' | wc -l"

echo
echo "Bitti. Dogrulama: curl -so /dev/null -w '%{http_code}\\n' https://api.macsclub.com.tr/uploads/<dosya-adi>"
