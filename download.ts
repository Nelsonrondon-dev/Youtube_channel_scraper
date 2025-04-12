import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_NAME = process.env.CHANNEL_NAME ?? '';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const MAX_RESULTS = 50;
const VIDEO_LIMIT = Number(process.env.VIDEO_LIMIT) || 10;

if (!API_KEY) throw new Error('YOUTUBE_API_KEY no configurada.');
if (!CHANNEL_NAME) throw new Error('CHANNEL_NAME no configurado.');

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
    }
  }
  return audioPath;
}

async function runDownloadOnly() {
  try {
    console.log('🚀 Iniciando descarga de audios desde el canal...');
    console.log(`🔧 Canal: ${CHANNEL_NAME} | Límite de videos: ${VIDEO_LIMIT}`);
    const playlistId = await getUploadsPlaylistId();
    const videoIds = await getAllVideoIdsFromPlaylist(playlistId);
    for (const videoId of videoIds) {
      try {
        downloadAudio(videoId);
      } catch (err) {
        console.error(`❌ Falló la descarga del video ${videoId}`);
      }
    }
    console.log('✅ Descarga completa. Los audios están en la carpeta "audios".');
  } catch (err) {
    console.error('❌ Error general:', err);
  }
}

runDownloadOnly();
