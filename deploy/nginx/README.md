# API için Plesk nginx kurulumu

Bu dosyaları operatör elle uygular. Bu görev kapsamında VPS/Plesk'e bağlanılmaz ve canlı ayar değiştirilmez. Hedef `api.macsclub.com.tr` → **host üzerinde** `127.0.0.1:8010` → backend-ts. nginx başka bir konteyner içindeyse bu loopback adresi host değildir; bu dosyalar o topolojiye doğrudan uygulanmaz.

## 1. Mevcut durumu kaydet

VPS keşif notundan domainin etkin nginx vhost dosyasını, upload bind kaynağını ve backend portunu bul. Dizin tahmin etme. Aşağıdaki komutlar kullanıcı tarafından VPS üzerinde çalıştırılır; repo kökünden ilgili dosyaları önce güvenli bir çalışma dizinine kopyala.

```sh
sudo nginx -v
sudo nginx -V 2>&1
sudo nginx -t
backup_dir="/root/macs-nginx-$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$backup_dir"
sudo sh -c 'nginx -T > "$1/nginx-before.txt" 2>&1' sh "$backup_dir"
sudo cp -a /etc/nginx/conf.d "$backup_dir/conf.d"
curl -fsS http://127.0.0.1:8010/health
```

`nginx -T` çıktısını özel tut; başka vhost bilgileri içerebilir. Plesk'te domainin mevcut “Additional nginx directives” metnini, HTTP/2, Proxy mode, Smart static files processing ve Serve static files directly by nginx seçeneklerini aynı yedeğe kaydet. Önceden var olan `api.macsclub-http.conf` dosyasını ayrıca not et; geri almada silmek yerine yedeğini geri koyacaksın. İlk `nginx -t` hatalıysa kuruluma başlama.

`nginx -V` çıktısında `--with-http_v2_module` gerekir. `http2 on;` **nginx ≥1.25.1 için http/server bağlamında** geçerlidir. Eski Plesk nginx sürümünde bu satırı yapıştırılacak metinden çıkar ve Plesk'in HTTP/2 kutusu / oluşturduğu `listen ... http2` ayarını kullan. Elle ikinci bir `listen 443` satırı ekleme. Yeni sürümde Plesk zaten aynı server bloğuna `http2 on;` üretiyorsa ek kopyayı çıkar. [nginx HTTP/2 belgesi](https://nginx.org/en/docs/http/ngx_http_v2_module.html#http2).

## 2. http bağlamı dosyasını yerleştir

```sh
sudo install -m 0644 deploy/nginx/api.macsclub-http.conf /etc/nginx/conf.d/api.macsclub-http.conf
sudo nginx -t
```

`nginx -T` ile `/etc/nginx/conf.d/*.conf` include'unun gerçekten **http** içinde olduğunu doğrula. Zone tanımları ve upstream yalnız bir kez yüklenmeli. Bu dosyayı Plesk metin alanına yapıştırma. Server dosyasını da `conf.d/*.conf` altına kopyalama: çıplak `location` blokları http bağlamında geçersizdir.

## 3. Plesk domain ayarını uygula

1. **Websites & Domains → api.macsclub.com.tr → Hosting & DNS → Apache & nginx Settings** bölümüne gir. TLS sertifikası geçerli olsun; HTTP → HTTPS yönlendirmesini Plesk üzerinden etkinleştir.
2. Plesk sürümünde sunulduğu yerde **HTTP/2** kutusunu etkinleştir (bazı sürümlerde sunucu seviyesindedir). Yukarıdaki sürüm kontrolüne göre `http2 on;` satırını koru veya çıkar.
3. API'nin Apache'ye veya Plesk statik servisine kaçmasını önle: domain için Proxy mode, Smart static files processing ve Serve static files directly by nginx ayarlarını incele; API yollarını karşılayan otomatik proxy/statik location'ları devre dışı bırak. Bu seçeneklerin ürettiği yapı sürüme göre değişir; kutuyu kapatmak tek başına yeterlilik kanıtı değildir.
4. **Additional nginx directives** alanına `api.macsclub-server.conf` içeriğini koy. Mevcut ilgili direktifleri yenileriyle değiştir; tüm eski metni körlemesine birleştirme. `client_max_body_size`, `http2` veya `location /` için ikinci tanım bırakma.
5. `ngx_brotli` yüklüyse üç location'daki yorumlu `brotli off;` satırını aç; Plesk'in brotli ayarının bunları geçersiz kılmadığını denetle. Modül yokken bu direktif nginx'i başlatmaz. Üç location'da `gzip off;` uygulamanın sıkıştırılmış baytlarını korur.
6. Kaydet/Uygula. Plesk bu işlem sırasında doğrulama/reload yapabilir. “duplicate location” vb. hatada metni önceki haline döndür. Üretilen Plesk vhost dosyasını elle düzenleme: sonraki panel işleminde kaybolur. Kök location panel seçenekleriyle kaldırılamıyorsa Plesk custom template ile tek kök proxy location sağlanmadan kurulumu tamamlanmış sayma; gereken şablon keşif çıktısına bağlıdır.
7. Etkin `nginx -T` çıktısında bu domainin HTTPS server bloğunu kontrol et: kök proxy tek olsun, `/auth/login` ve `/uploads/` blokları mevcut olsun; API yollarını yakalayan regex/exact location kalmasın. `^~` login/uploads için regex üstünlüğünü engeller, kök API için çakışan Plesk regex'lerini ayrıca kaldırmak gerekir. ACME doğrulama yolunu koru.

```sh
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl is-active nginx
```

`nginx -t` geçmeden reload yapma. Docker doğrulaması bu domainin gerçek Plesk vhost birleşiminin testinin yerini tutmaz.

## Sınırlar ve başlıklar

- Genel zone `20r/s`, burst `40`; login zone `5r/m`, burst `10`; IP başına eşzamanlı bağlantı/istek limiti `30`. Aşım 429. Login için nginx limiti uygulamanın başarısız giriş sayacından bağımsızdır, başarılı girişleri de sayar. nginx 429/413/405 yanıtları JSON yerine nginx HTML gövdesi içerebilir. HTTP/2 akışları bağlantı limitinde ayrı sayılır.
- `client_header_timeout 10s` eksik header bekleyen bağlantıları keser. **Bun 1.3.5 `idleTimeout`, kısmi header göndermede bağlantıyı kapatmaz; slowloris önlemi nginx'teki header/body timeout'larıdır.** `client_body_timeout 10s` tüm upload süresi değil ardışık okumalar arası sınırdır; sürekli yavaş veri akışına mutlak toplam süre koymaz. `send_timeout 15s` de yazmalar arasıdır. [nginx timeout belgesi](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_body_timeout).
- `env.ts` varsayılanı ve `backend-ts/docker-compose.contract.yml`: `MAX_UPLOAD_SIZE=5242880` (5 MiB). Ana `docker-compose.yml` bu değeri override etmez; env varsayılanını veya operatörün env değerini kullanır. Uygulama multipart için `262144` bayt ekler: toplam `5505024 < 6291456` (`6m`). Mevcut varsayılanlar tutarlı; compose değişikliği gerekmez. Operatör mevcut çalışan konteynerde `printenv MAX_UPLOAD_SIZE` ile override olup olmadığını kontrol etsin (boşsa varsayılan); artırılmışsa nginx sınırı da en az `MAX_UPLOAD_SIZE + 262144` bayt olmalıdır. Bu görev `.env` değiştirmez. JSON/form uygulama sınırı ayrıca 2 MiB'dir.
- nginx her location'da istemcinin `X-Real-IP` değerini `$remote_addr` ile **değiştirir**, `X-Forwarded-For` değerini siler; boş X-Real-IP ile ikinci header eklenmez. `X-Forwarded-Proto $scheme` de istemci değerinin yerine geçer. Uygulama yalnız güvenilen tek hop'tan gelen X-Real-IP'yi kullanır. Plesk real_ip ayarı varsa `$remote_addr` kaynağını denetle; internete açık geniş `set_real_ip_from` tanımları kullanma. Backend 8010 portunu dışarı açma.
- HSTS uygulama tarafından yalnız HTTPS proxy bilgisiyle gönderilir. nginx'in kendi ürettiği hatalarda uygulama güvenlik başlıkları bulunmayabilir. API `Vary: Accept-Encoding, Origin` üretir. Cache JSON ve ≥1 KiB cache dışı yanıtlar uygulamada br/gzip ile sıkıştırılır; nginx tekrar sıkıştırmaz.
- `/uploads/` **uygulamaya proxy** edilir; alias yoktur. Uygulama path doğrulamasını ve mevcut upload volume'unu kullanır. Host yolu bu snippet'e yazılmaz; mevcut `UPLOAD_HOST_DIR` bind kaynağını VPS keşif notundan doğrula. UUID dosyalarına bir yıl cache + immutable verilir; aynı isimle içeriği değiştirme. nginx uygulamanın `Cache-Control: public, max-age=0` başlığını gizler; başarılı statik yanıtta `max-age=31536000` ve `public, immutable` üretir. 404/403/5xx için immutable eklenmez (`always` kullanılmaz). [nginx expires/add_header belgesi](https://nginx.org/en/docs/http/ngx_http_headers_module.html).
- TRACE/CONNECT rewrite bloğu 405 döndürür. Ancak standart nginx 1.27.5, **CONNECT authority-form isteğini rewrite öncesinde parser'da 400 ile reddeder**. Bu yapılandırmada TRACE 405; CONNECT 400 olabilir ve upstream'e ulaşmaz. CONNECT için kesin 405 kabul şartı standart nginx ile karşılanmış değildir; tüm 400 hatalarını 405'e çevirmek doğru olmaz.

## 4. Canlı doğrulama (operatör)

```sh
curl -I --http2 https://api.macsclub.com.tr/health
curl -sS --http2 -D - -o /dev/null -H 'Accept-Encoding: br' \
  'https://api.macsclub.com.tr/projects?limit=100'
curl -sS -D - -o /dev/null -X TRACE https://api.macsclub.com.tr/health
curl -sS -D - -o /dev/null -H 'X-Real-IP: 203.0.113.99' \
  -H 'X-Forwarded-For: 203.0.113.98' https://api.macsclub.com.tr/health
```

İlk yanıtta `HTTP/2 200` ve `strict-transport-security` beklenir. Küçük `/health` yanıtında br bekleme; ikinci GET'te gövde ≥1 KiB ve veri varsa `content-encoding: br`, `Vary` içinde `Accept-Encoding` ve `Origin` kontrol edilir. Sahte IP'li sağlık yanıtı tek başına overwrite kanıtı değildir: uygulamanın mevcut güvenlik loglarında gerçek IP'yi kontrol et veya yalnız yerel izole echo upstream testi kullan; üretimde debug echo endpoint açma.

Aşağıdaki yük problarını kısa bakım aralığında kendi IP'nden çalıştır; diğer kullanıcılarla aynı NAT IP'sini kullanıyorsan onları da sınırlayabilir. Login burst denemesinde gerçek kimlik bilgisi gönderme. nginx error log'da zone adını kontrol et; uygulama da 429 üretebilir.

```sh
seq 1 100 | xargs -P 20 -I '{}' curl -sS -o /dev/null -w '%{http_code}\n' \
  https://api.macsclub.com.tr/health | sort | uniq -c
seq 1 20 | xargs -P 10 -I '{}' curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST https://api.macsclub.com.tr/auth/login | sort | uniq -c
# Genel burst sonrası en az 3 s, login testi sonrası en az 132 s dolum bekle.
sleep 3
probe_body=$(mktemp)
dd if=/dev/zero of="$probe_body" bs=1048576 count=7
curl -sS -o /dev/null -w '%{http_code}\n' -H 'Expect:' \
  --data-binary "@$probe_body" https://api.macsclub.com.tr/health
rm -f "$probe_body"
```

Burst'te 429, 7 MiB gövdede 413 beklenir. `dd`/curl başarısızsa testi geçti sayma.

Eksik header ve CONNECT probları TLS üzerinde (Python 3):

```sh
python3 - <<'PY'
import socket, ssl, time
host = 'api.macsclub.com.tr'
for payload in (
    b'GET /health HTTP/1.1\r\nHost: api.macsclub.com.tr\r\nX-Slow: ',
    b'CONNECT api.macsclub.com.tr:443 HTTP/1.1\r\nHost: api.macsclub.com.tr\r\n\r\n',
):
    with socket.create_connection((host, 443), timeout=15) as raw:
        with ssl.create_default_context().wrap_socket(raw, server_hostname=host) as s:
            start = time.monotonic()
            s.sendall(payload)
            print(round(time.monotonic() - start, 2), 'send')
            print(repr(s.recv(1024)), round(time.monotonic() - start, 2), 's')
PY
```

Eksik header yaklaşık 10 saniyede kapanmalı (boş okuma veya 408); 15 saniyelik Python timeout'u **başarı değildir**. CONNECT yukarıdaki parser sınırlaması nedeniyle 400 olabilir.

## 5. Fail2ban örneği (isteğe bağlı)

Brief'teki örnek `/etc/fail2ban/filter.d/macs-api-security.conf`:

```ini
[Definition]
failregex = ^.*"event":"security".*"kind":"(ip_login_limit|rate_limit|write_rate_limit|path_traversal)".*"ip":"<HOST>"
ignoreregex =
```

Bu, brief'in örneğidir; mevcut kod `login_ip_limit` adını kullanır, `ip_login_limit` değil. `write_rate_limit` ve `path_traversal` şu an security-log kind kümesinde yoktur; yazma limiti de `rate_limit` olarak kaydedilir. Mevcut tek satır Pino JSON şeması için filtrede kullanılacak daha dar alternatif:

```ini
[Definition]
failregex = ^\{"level":\d+,"time":\d+,"pid":\d+,"hostname":"[^"]+","event":"security","kind":"(?:login_ip_limit|rate_limit)","ip":"<HOST>",
ignoreregex =
```

Önce gerçek log satırlarını hassas içerik içermeyen yerel örnek dosyasına alıp `fail2ban-regex /path/to/security-sample.log /etc/fail2ban/filter.d/macs-api-security.conf` ile eşleşme ve negatif örnekleri denetle. JSON alan sırası/logger base alanları değişirse bu dar regex'i yeniden doğrula. Gerçek log kaynağı, timestamp/datepattern ve dosya veya journald backend'i VPS keşfine bağlıdır; örnek jail'i körlemesine etkinleştirme. nginx'in kendi 429 logları uygulama JSON filtresine girmez. Fail2ban servis/jail değişikliği bu dosyaların otomatik bir parçası değildir.

## 6. Kesin geri alma sırası

Yeni shell açıldıysa önce `sudo ls -ld /root/macs-nginx-*` ile yedekleri incele,
sonra bu uygulamaya ait doğrulanmış yolu `backup_dir=/root/macs-nginx-YYYYMMDD-HHMMSS`
olarak yeniden ayarla. `sudo test -d "$backup_dir/conf.d"` ile kontrol et.

1. Plesk'te **önce** Additional nginx directives metnini ve kaydettiğin HTTP/2/proxy/statik seçeneklerini eski haline getir; Kaydet/Uygula. Yeni server bloğunun `macs_backend_ts` ve zone referanslarını kaldırmadan http dosyasını silme. Plesk kaydı reddederse http dosyasını yerinde tutup önce domain metnini düzelt.
2. Başlangıçta dosya yoksa `sudo rm /etc/nginx/conf.d/api.macsclub-http.conf`; varsa `sudo cp -a "$backup_dir/conf.d/api.macsclub-http.conf" /etc/nginx/conf.d/api.macsclub-http.conf` ile yalnız o dosyayı geri yükle. Bütün conf.d dizinini silme/üzerine yazma. Değiştirilmiş custom template varsa onun da önceki sürümünü geri yükle ve Plesk ile vhost'u yeniden üret.
3. `sudo nginx -t && sudo systemctl reload nginx`; hata varsa reload etme, çıktıya göre yedek domain ayarlarını ve http dosyasını geri getir. Diskteki bozuk ayar nedeniyle çalışan eski worker'ı durdurma.
4. `sudo systemctl is-active nginx`, HTTPS `/health` ve önceki upstream davranışını kontrol et. Fail2ban ayrıca etkinleştirildiyse yalnız bu kurulumda eklenen filtre/jail'i geri alıp kendi doğrulama/reload işlemini yap. Upload verilerine, Docker volume'larına veya diğer domain ayarlarına dokunma.

## Yerel sözdizimi kontrolü

Repo kökünde, sunucuya erişmeden:

```sh
docker run --rm \
  -v "$PWD/deploy/nginx/api.macsclub-http.conf:/etc/nginx/conf.d/00-macs-http.conf:ro" \
  -v "$PWD/deploy/nginx/api.macsclub-server.conf:/tmp/srv.conf:ro" \
  nginx:1.27-alpine sh -c '
    printf "events {}\nhttp { include /etc/nginx/conf.d/00-macs-http.conf; server { listen 80; include /tmp/srv.conf; } }\n" > /tmp/test.conf
    nginx -t -c /tmp/test.conf
  '
```

Beklenen: `syntax is ok`, `test is successful`, çıkış kodu 0. Bu kontrol TLS/HTTP/2 müzakeresini veya gerçek Plesk birleşimini sınamaz. Yerel işlevsel probun komutları ve çıktıları Task 12 raporundadır.


## Upload HEAD cache kontrolleri

Mevcut dosya adını gerçek upload envanterinden seçerek nginx üzerinden denetle:

```sh
curl -I https://api.macsclub.com.tr/uploads/MEVCUT-DOSYA.webp
curl -I https://api.macsclub.com.tr/uploads/missing-cache-probe.webp
```

İlk yanıt 200, uzun süreli `max-age` ve `immutable` içermeli; `max-age=0` içermemeli.
İkinci yanıt 404 olmalı ve `immutable` içermemeli.
