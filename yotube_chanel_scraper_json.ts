import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import pLimit from 'p-limit';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_NAME = process.env.CHANNEL_NAME ?? '';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const MAX_RESULTS = 50;
const VIDEO_LIMIT = Number(process.env.VIDEO_LIMIT) || 10;
const CONCURRENCY_LIMIT = Number(process.env.CONCURRENCY) || 1;

if (!API_KEY) throw new Error('YOUTUBE_API_KEY no configurada.');
if (!CHANNEL_NAME) throw new Error('CHANNEL_NAME no configurado.');

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
  const res = await axios.get(`${BASE_URL}/search`, {
    params: {
      part: 'snippet',
      q: query,
      type: 'channel',
      maxResults: 1,
      key: API_KEY,
    },
  });
  return res.data.items[0]?.snippet.channelId;
}

async function getUploadsPlaylistId(): Promise<string> {
  const channelId = await getChannelIdBySearch(CHANNEL_NAME);
  const res = await axios.get(`${BASE_URL}/channels`, {
    params: {
      part: 'contentDetails',
      id: channelId,
      key: API_KEY,
    },
  });
  return res.data.items[0]?.contentDetails.relatedPlaylists.uploads;
}

async function getAllVideoIdsFromPlaylist(playlistId: string): Promise<string[]> {
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
}

function transcriptExists(videoId: string): boolean {
  return fs.existsSync(path.join('transcripciones', `${videoId}.txt`));
}

function downloadAudio(videoId: string): string {
  const audioDir = 'audios';
  const audioPath = path.join(audioDir, `${videoId}.mp3`);
  const cookiesPath = 'cookies.txt';
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);
  if (!fs.existsSync(audioPath)) {
    console.log(`🎧 Descargando audio para ${videoId}`);
    const cookiesOption = fs.existsSync(cookiesPath) ? `--cookies ${cookiesPath}` : '';
    const command = `yt-dlp ${cookiesOption} -x --audio-format mp3 -o "${audioPath}" https://www.youtube.com/watch?v=${videoId}`;
    try {
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      console.error(`❌ Error descargando ${videoId}:`, error);
      throw error;
    }
  }
  return audioPath;
}

function transcribeAudio(videoId: string, audioPath: string): string[] {
  const transcriptPath = path.join('transcripciones', `${videoId}.txt`);
  if (!fs.existsSync('transcripciones')) fs.mkdirSync('transcripciones');
  console.log(`🗣️ Transcribiendo ${videoId}`);
  // const command = `whisper "${audioPath}" --language Spanish --model medium --device cuda --output_format txt --output_dir transcripciones`;
  const command = `whisper "${audioPath}" --language Spanish --model base --output_format txt --output_dir transcripciones`;
  execSync(command, { stdio: 'inherit' });
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

    const audioPath = downloadAudio(videoId);
    const transcript = transcriptExists(videoId)
      ? fs.readFileSync(path.join('transcripciones', `${videoId}.txt`), 'utf-8').split('\n')
      : transcribeAudio(videoId, audioPath);

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
      transcript,
    };

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  } catch (err) {
    console.error(`❌ Error procesando ${videoId}:`, err);
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
    const results = await Promise.all(videoIds.map(id => limit(() => processVideo(id))));
    const videos = results.filter((v): v is VideoData => v !== null);
    fs.writeFileSync('videos.json', JSON.stringify(videos, null, 2), 'utf-8');
    console.log('✅ Proceso completado. Archivo videos.json generado.');
  } catch (err) {
    console.error('❌ Error general:', err);
  }
}

run();
