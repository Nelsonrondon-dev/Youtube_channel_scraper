#!/bin/bash

echo "🚀 Iniciando setup del entorno..."

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (v18 LTS) y npm
echo "📦 Instalando Node.js y npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Python 3, pip y venv
echo "🐍 Instalando Python, pip y venv..."
sudo apt install -y python3 python3-pip python3-venv

# Instalar ffmpeg (necesario para whisper y yt-dlp)
echo "🎞️ Instalando ffmpeg..."
sudo apt install -y ffmpeg

# Instalar yt-dlp
echo "⬇️ Instalando yt-dlp..."
sudo pip3 install -U yt-dlp

# Instalar Whisper
echo "🧠 Instalando Whisper..."
sudo pip3 install -U openai-whisper

# Instalar dependencias del proyecto Node.js
echo "📦 Instalando dependencias de Node..."
npm install

echo "✅ Setup completo. Puedes ejecutar tu script con:"
echo "    npm run dev"
