#!/bin/bash

set -e  # Detener si algo falla

echo "🔄 Actualizando sistema..."
sudo dnf update -y

# Instalar Git
echo "📁 Instalando Git..."
sudo dnf install -y git

# Instalar Node.js y npm
echo "🟢 Instalando Node.js y npm..."
sudo dnf install -y nodejs

# Instalar TypeScript globalmente
echo "📦 Instalando TypeScript..."
sudo npm install -g typescript

# Instalar Python 3 y pip
echo "🐍 Instalando Python y pip..."
sudo dnf install -y python3 python3-pip

# Instalar yt-dlp y Whisper con pip global
echo "⬇️ Instalando yt-dlp y Whisper..."
sudo pip3 install -U yt-dlp openai-whisper

# Instalar ffmpeg desde binario precompilado
echo "🎞️ Instalando ffmpeg desde binario..."
mkdir -p ~/bin
cd ~/bin
curl -L -o ffmpeg.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xvf ffmpeg.tar.xz
cd ffmpeg-*-amd64-static
sudo mv ffmpeg /usr/local/bin/
sudo mv ffprobe /usr/local/bin/
cd ~
rm -rf ~/bin/ffmpeg*  # Limpiar archivos descargados

# Volver a la carpeta del proyecto
cd ~/Youtube_channel_scraper

# Instalar dependencias de Node.js
echo "📦 Instalando dependencias de Node.js..."
npm install

echo ""
echo "✅ Setup completo."
echo "👉 Ejecuta tu script con:"
echo "    node dist/yotube_chanel_scraper_json.js"
