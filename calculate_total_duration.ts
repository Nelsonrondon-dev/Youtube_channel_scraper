import fs from 'fs';

// Leer el archivo JSON
const jsonData = fs.readFileSync('videos.json', 'utf8');

// Función para convertir la duración de ISO 8601 a segundos
function iso8601ToSeconds(duration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  if (!matches) return 0;

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// Parsear el JSON
const videos = JSON.parse(jsonData);

// Calcular la duración total en segundos
let totalDurationSeconds = 0;
videos.forEach((video: any) => {
  totalDurationSeconds += iso8601ToSeconds(video.duration);
});

// Convertir la duración total a horas
const totalDurationHours = totalDurationSeconds / 3600;

console.log(`Duración total de los videos: ${totalDurationHours.toFixed(2)} horas`);