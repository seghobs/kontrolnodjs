# Kontrol

Instagram yorum kontrol ve token yonetim paneli.

## Ozellikler

- Flask tabanli web arayuzu
- Admin panelinden token ekleme/guncelleme/silme
- Token gecerlilik kontrolu ve otomatik pasife alma
- Yorum kontrolu icin aktif ve calisan token secimi
- Veri saklama: `app.db` (SQLite)

## Gereksinimler

- Python 3.10+
- Git
- Internet baglantisi

## Kurulum (Sadece Linux Bash)

Bu proje yalnizca Linux Bash terminali icin hazirlanmistir.

## PythonAnywhere (Bash) indirme yontemi

PythonAnywhere Bash Console icinde:

```bash
cd ~
git clone https://github.com/seghobs/kontrol.git
cd kontrol
chmod -R u+rwX .
```

Direkt mevcut bos dizine klonlamak istersen:

```bash
cd /hedef/klasor
git clone https://github.com/seghobs/kontrol.git .
chmod -R u+rwX .
```

`setup_kontrol.sh` kullanmak istersen:

```bash
chmod +x setup_kontrol.sh
./setup_kontrol.sh
```

### 1) Repo'yu klonla

```bash
git clone https://github.com/seghobs/kontrol.git
cd kontrol
```

### 2) Python sanal ortam olustur (onerilen)

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3) Flask bagimliligini kur

```bash
pip install flask requests
```

### 4) Kurulum scripti ile izinleri ayarla

```bash
chmod +x setup_kontrol.sh
./setup_kontrol.sh
```

Bulundugun bos dizine direkt indirmek icin:

```bash
./setup_kontrol.sh https://github.com/seghobs/kontrol.git .
```

Not: `setup_kontrol.sh` projeyi calistirmaz, sadece klonlama ve gerekli yazma/okuma izinlerini ayarlar.

## Alternatif kurulum (script olmadan)

```bash
git clone https://github.com/seghobs/kontrol.git
cd kontrol
chmod -R u+rwX .
```

## Bash script kullanim detaylari

Script dosyasi: `setup_kontrol.sh`

- Parametre 1: Repo URL (opsiyonel)
- Parametre 2: Hedef dizin (opsiyonel)

Varsayilan kullanim:

```bash
./setup_kontrol.sh
```

Bu komut bulundugun bos dizine direkt klonlar (ek klasor olusturmaz).

Bulundugun bos dizine direkt klonlamak icin:

```bash
./setup_kontrol.sh https://github.com/seghobs/kontrol.git .
```

Onemli:

- `.` hedefi icin dizin bos olmali
- Script uygulamayi calistirmaz
- Sadece klonlar ve okuma/yazma izinlerini ayarlar

## Uygulamayi calistirma

```bash
python flask_app.py
```

Uygulama adresi:

```text
http://127.0.0.1:5000
```

Admin giris:

```text
http://127.0.0.1:5000/admin/login
```

## Proje yapisi

- `flask_app.py`: uygulama giris noktasi
- `app_core/`: moduler backend kodu
  - `routes/`: route dosyalari
  - `storage.py`: SQLite (`app.db`) islemleri
  - `token_service.py`: token akis/failover islemleri
- `templates/`: HTML dosyalari
- `static/js/`: ayri JavaScript dosyalari

## Notlar

- Veritabani dosyasi: `app.db`
- JSON dosyalari (`token.json`, `tokens.json`, `exemptions.json`) eski veriler icin migration amacli olabilir; aktif sistem DB uzerinden calisir.
