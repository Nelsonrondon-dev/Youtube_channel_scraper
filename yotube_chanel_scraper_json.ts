import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import pLimit from 'p-limit';
import dotenv from 'dotenv';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_NAME = process.env.CHANNEL_NAME ?? '';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const MAX_RESULTS = 50;
const VIDEO_LIMIT = Number(process.env.VIDEO_LIMIT) || 10;
const CONCURRENCY_LIMIT = Number(process.env.CONCURRENCY) || 1;

// Validar que las variables de entorno necesarias estén configuradas
if (!API_KEY) {
  throw new Error('❌ La clave de API de YouTube (YOUTUBE_API_KEY) no está configurada en las variables de entorno.');
}

if (!CHANNEL_NAME) {
  throw new Error('❌ El nombre del canal (CHANNEL_NAME) no está configurado en las variables de entorno.');
}

interface VideoData {
  title: string;
  videoId: string;
  url: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  description: string;
  channelTitle: string;
  duration: string;
  definition: string;
  caption: string;
  licensedContent: boolean;
  thumbnails: Record<string, string>;
  transcript?: string[];
}

async function getChannelIdBySearch(query: string): Promise<string> {
  try {
    const res = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        q: query,
        type: 'channel',
        maxResults: 1,
        key: API_KEY,
      },
    });
    if (!res.data.items || res.data.items.length === 0) {
      throw new Error('No se encontró ningún canal con ese nombre.');
    }
    return res.data.items[0].snippet.channelId;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('❌ Error al obtener el ID del canal:', err.response?.data || err.message);
    } else {
      console.error('❌ Error desconocido al obtener el ID del canal:', (err as Error).message);
    }
    throw err;
  }
}

async function getUploadsPlaylistId(): Promise<string> {
  try {
    const channelId = await getChannelIdBySearch(CHANNEL_NAME);
    console.log(`🔎 Canal encontrado: ${channelId}`);
    const res = await axios.get(`${BASE_URL}/channels`, {
      params: {
        part: 'contentDetails',
        id: channelId,
        key: API_KEY,
      },
    });
    if (!res.data.items || res.data.items.length === 0) {
      throw new Error('No se encontró el canal tras obtener el ID.');
    }
    return res.data.items[0].contentDetails.relatedPlaylists.uploads;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('❌ Error al obtener la lista de reproducción de subidas:', err.response?.data || err.message);
    } else {
      console.error('❌ Error desconocido al obtener la lista de reproducción de subidas:', (err as Error).message);
    }
    throw err;
  }
}

async function getAllVideoIdsFromPlaylist(playlistId: string): Promise<string[]> {
  try {
    let videoIds: string[] = [];
    let nextPageToken = '';
    do {
      const res = await axios.get(`${BASE_URL}/playlistItems`, {
        params: {
          part: 'contentDetails',
          playlistId,
          maxResults: MAX_RESULTS,
          pageToken: nextPageToken,
          key: API_KEY,
        },
      });
      const ids = res.data.items.map((item: any) => item.contentDetails.videoId);
      videoIds = videoIds.concat(ids);
      nextPageToken = res.data.nextPageToken || '';
    } while (nextPageToken && videoIds.length < VIDEO_LIMIT);
    return videoIds.slice(0, VIDEO_LIMIT);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('❌ Error al obtener los IDs de los videos de la lista de reproducción:', err.response?.data || err.message);
    } else {
      console.error('❌ Error desconocido al obtener los IDs de los videos:', (err as Error).message);
    }
    throw err;
  }
}

function transcriptExists(videoId: string): boolean {
  return fs.existsSync(path.join('transcripciones', `${videoId}.txt`));
}

function downloadAudio(videoId: string): string {
  const audioPath = path.join('audios', `${videoId}.mp3`);
  if (!fs.existsSync('audios')) fs.mkdirSync('audios');
  if (!fs.existsSync(audioPath)) {
    console.log(`🎧 Descargando audio para ${videoId}`);
    execSync(`yt-dlp -x --audio-format mp3 -o "${audioPath}" https://www.youtube.com/watch?v=${videoId}`);
  } else {
    console.log(`🎼 Audio ya existe para ${videoId}`);
  }
  return audioPath;
}

function transcribeAudio(videoId: string, audioPath: string): string[] {
  const transcriptPath = path.join('transcripciones', `${videoId}.txt`);
  if (!fs.existsSync('transcripciones')) fs.mkdirSync('transcripciones');
  console.log(`🗣️ Transcribiendo ${videoId}`);
  execSync(`whisper "${audioPath}" --language Spanish --model base --output_format txt --output_dir transcripciones`, { stdio: 'inherit' });
  return fs.readFileSync(transcriptPath, 'utf-8').split('\n');
}

async function processVideo(videoId: string): Promise<VideoData | null> {
  try {
    const jsonPath = path.join('transcripciones', `${videoId}.json`);
    if (fs.existsSync(jsonPath)) {
      console.log(`⏭️ Ya procesado: ${videoId}`);
      return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    }
    const res = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: videoId,
        key: API_KEY,
      },
    });
    const item = res.data.items[0];
    if (!item) return null;
    const thumbnails: Record<string, string> = {};
    Object.entries(item.snippet.thumbnails || {}).forEach(([key, value]: any) => {
      thumbnails[key] = value.url;
    });

    let transcript: string[] = [];
    const audioPath = downloadAudio(videoId);
    if (!transcriptExists(videoId)) {
      transcript = transcribeAudio(videoId, audioPath);
    } else {
      transcript = fs.readFileSync(path.join('transcripciones', `${videoId}.txt`), 'utf-8').split('\n');
    }

    const data: VideoData = {
      title: item.snippet.title,
      videoId: item.id,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics.viewCount || '0',
      likeCount: item.statistics.likeCount || '0',
      commentCount: item.statistics.commentCount || '0',
      description: item.snippet.description || '',
      channelTitle: item.snippet.channelTitle || '',
      duration: item.contentDetails.duration,
      definition: item.contentDetails.definition,
      caption: item.contentDetails.caption,
      licensedContent: item.contentDetails.licensedContent,
      thumbnails,
      transcript
    };

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(`❌ Error procesando ${videoId}:`, err.response?.data || err.message);
    } else {
      console.error(`❌ Error desconocido procesando ${videoId}:`, (err as Error).message);
    }
    return null;
  }
}

async function run() {
  try {
    console.log('🚀 Iniciando extracción de datos del canal...');
    console.log(`🔧 Canal: ${CHANNEL_NAME} | Límite de videos: ${VIDEO_LIMIT} | Concurrencia: ${CONCURRENCY_LIMIT}`);
    const playlistId = await getUploadsPlaylistId();
    const videoIds = await getAllVideoIdsFromPlaylist(playlistId);

    const limit = pLimit(CONCURRENCY_LIMIT);
    const results = await Promise.all(
      videoIds.map(id => limit(() => processVideo(id)))
    );

    const videos = results.filter((v): v is VideoData => v !== null);
    fs.writeFileSync('videos.json', JSON.stringify(videos, null, 2), 'utf-8');
    console.log('✅ Proceso completado. Archivo videos.json generado.');
  } catch (err) {
    console.error('Error general:', err);
  }
}

run();
