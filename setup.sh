#!/bin/bash

set -e  # Detener si algo falla

echo "🔄 Actualizando sistema..."
sudo dnf update -y

echo "🖥️ Instalando controladores NVIDIA y CUDA manualmente para Amazon Linux 2023..."

echo "PREPARANDO EL SISTEMA..."

dnf check-release-update
sudo dnf update -y
sudo dnf install -y dkms 
sudo systemctl enable --now dkms
if (uname -r | grep -q ^6.12.); then
  sudo dnf install -y kernel-devel-$(uname -r)  kernel6.12-modules-extra
else
  sudo dnf install -y kernel-devel-$(uname -r)  kernel-modules-extra
fi

echo "🔄 Reiniciando el sistema para aplicar cambios..."
sudo reboot

echo "Instalando controladores NVIDIA y CUDA..."
sudo dnf config-manager --add-repo https://developer.download.nvidia.com/compute/cuda/repos/amzn2023/x86_64/cuda-amzn2023.repo
sudo dnf install -y nvidia-driver
sudo dnf install -y cuda-toolkit
sudo reboot

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


nvidia-smi
echo "✅ nvidia-smi está funcionando correctamente."
echo ""
echo "✅ Setup completo con GPU."
echo "👉 Asegúrate de tener CUDA visible con: nvidia-smi"
echo "👉 Ejecuta tu script con:"
echo "    npm run dev"