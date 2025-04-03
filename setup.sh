#!/bin/bash

set -e  # Detener si algo falla

echo "🔄 Actualizando sistema..."
sudo dnf update -y

echo "📁 Instalando Git..."
sudo dnf install -y git

echo "🟢 Instalando Node.js y npm..."
sudo dnf install -y nodejs

echo "🧬 Clonando repositorio del proyecto..."
cd ~
git clone -b feature/G4DN https://github.com/Nelsonrondon-dev/Youtube_channel_scraper.git
cd Youtube_channel_scraper

echo "📦 Instalando TypeScript..."
sudo npm install -g typescript

echo "🐍 Instalando Python, pip y herramientas esenciales..."
sudo dnf install -y python3 python3-pip python3-devel gcc gcc-c++ make cmake

echo "⬇️ Instalando PyTorch con soporte para CUDA..."
pip3 install --upgrade pip
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

echo "🧠 Instalando Whisper (con soporte CUDA)..."
pip3 install openai-whisper --upgrade --no-cache-dir

echo "⬇️ Instalando yt-dlp..."
pip3 install -U yt-dlp

echo "🎞️ Instalando ffmpeg desde binario..."
mkdir -p ~/bin
cd ~/bin
curl -L -o ffmpeg.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xvf ffmpeg.tar.xz
cd ffmpeg-*-amd64-static
sudo mv ffmpeg /usr/local/bin/
sudo mv ffprobe /usr/local/bin/
cd ~
rm -rf ~/bin/ffmpeg*

echo "📦 Instalando dependencias de Node.js..."
cd ~/Youtube_channel_scraper
npm install

echo ""
echo "✅ Setup completo con GPU."
echo "👉 Asegúrate de tener CUDA visible con: nvidia-smi"
echo "👉 Ejecuta tu script con:"
echo "    npm run dev"