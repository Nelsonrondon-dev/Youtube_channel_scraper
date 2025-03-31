# YouTube Channel Scraper

Este proyecto es una herramienta para extraer datos de un canal de YouTube, incluyendo información de videos, transcripciones y estadísticas. Los datos se guardan en un archivo JSON para su posterior análisis.

## Características

- Obtiene información detallada de videos de un canal de YouTube.
- Descarga audios de los videos y genera transcripciones utilizando `whisper`.
- Soporta concurrencia configurable para procesar múltiples videos simultáneamente.
- Guarda los datos en un archivo `videos.json`.

## Requisitos

- Node.js (v14 o superior)
- Una clave de API de YouTube válida
- Herramientas externas:
  - [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) para descargar audios.
  - [`whisper`](https://github.com/openai/whisper) para generar transcripciones.

## Instalación

1. Clona este repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd Youtube_channel_scraper
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
   ```
   YOUTUBE_API_KEY=tu_clave_de_api
   CHANNEL_NAME=nombre_del_canal
   VIDEO_LIMIT=10
   CONCURRENCY=1
   ```

4. Asegúrate de tener instalados `yt-dlp` y `whisper` en tu sistema.

## Uso

Ejecuta el script principal con Node.js:
```bash
node yotube_chanel_scraper_json.ts
```

El script generará:
- Archivos de audio en la carpeta `audios/`.
- Transcripciones en la carpeta `transcripciones/`.
- Un archivo `videos.json` con los datos recopilados.

## Configuración

Puedes ajustar las siguientes variables en el archivo `.env`:
- `YOUTUBE_API_KEY`: Tu clave de API de YouTube.
- `CHANNEL_NAME`: El nombre del canal de YouTube a procesar.
- `VIDEO_LIMIT`: Número máximo de videos a procesar (por defecto 10).
- `CONCURRENCY`: Número de procesos concurrentes (por defecto 1).

## Estructura del Proyecto

```
Youtube_channel_scraper/
├── audios/                # Carpeta para los archivos de audio descargados
├── transcripciones/       # Carpeta para las transcripciones generadas
├── videos.json            # Archivo JSON con los datos recopilados
├── yotube_chanel_scraper_json.ts # Script principal
├── .env                   # Variables de entorno
├── .gitignore             # Archivos y carpetas ignorados por Git
└── README.md              # Documentación del proyecto
```

## Dependencias

- [axios](https://github.com/axios/axios): Para realizar solicitudes HTTP.
- [p-limit](https://github.com/sindresorhus/p-limit): Para limitar la concurrencia.
- [dotenv](https://github.com/motdotla/dotenv): Para manejar variables de entorno.

## Notas

- Asegúrate de que tu clave de API de YouTube tenga permisos para acceder a los datos necesarios.
- El script puede generar archivos grandes dependiendo del número de videos procesados.

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.
