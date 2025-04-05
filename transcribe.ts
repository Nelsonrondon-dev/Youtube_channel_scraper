import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import axios from 'axios';
import pLimit from 'p-limit';
dotenv.config();

const execAsync = promisify(exec);
const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Límite de concurrencia: número de videos a procesar en paralelo
const CONCURRENCY_LIMIT = parseInt(process.env.CONCURRENCY_LIMIT || '1', 10);
const limit = pLimit(CONCURRENCY_LIMIT);

async function fetchVideoMetadata(videoId: string): Promise<any> {
  const res = await axios.get(`${BASE_URL}/videos`, {
    params: {
      part: 'snippet,statistics,contentDetails',
      id: videoId,
      key: API_KEY,
    },
  });
  const item = res.data.items?.[0];
  if (!item) throw new Error(`No se encontró metadata para ${videoId}`);

  const thumbnails: Record<string, any>[] = Object.values(item.snippet.thumbnails || {});

  return {
    id: item.id,
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    upload_date: item.snippet.publishedAt,
    view_count: item.statistics.viewCount || '0',
    like_count: item.statistics.likeCount || '0',
    comment_count: item.statistics.commentCount || '0',
    duration: item.contentDetails.duration,
    definition: item.contentDetails.definition,
    caption: item.contentDetails.caption,
    licensedContent: item.contentDetails.licensedContent,
    description: item.snippet.description || '',
    channel: item.snippet.channelTitle,
    channel_id: item.snippet.channelId,
    thumbnails,
    transcription_file: 'transcription.txt'
  };
}

function transcriptExists(videoId: string): boolean {
  const transcriptPath = path.join('transcripciones', videoId, 'transcription.txt');
  return fs.existsSync(transcriptPath);
}

async function transcribeAudio(videoId: string, audioPath: string): Promise<string[]> {
  const outputDir = path.join('transcripciones', videoId);
  const rawTranscript = path.join(outputDir, `${videoId}.txt`);
  const transcriptPath = path.join(outputDir, 'transcription.txt');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`🗣️ Transcripción iniciada para ${videoId} a las ${new Date().toISOString()}`);
  const command = `whisper "${audioPath}" --language Spanish --model base --output_format txt --output_dir ${outputDir}`;
  // const command = `whisper "${audioPath}" --language Spanish --model medium --device cuda --output_format txt --output_dir ${outputDir}`;
  await execAsync(command);

  if (!fs.existsSync(rawTranscript)) {
    throw new Error(`❌ Whisper no generó el archivo esperado: ${rawTranscript}`);
  }
  
  // Renombrar a transcription.txt
  fs.renameSync(rawTranscript, transcriptPath);

  console.log(`🗣️ Transcripción terminada para ${videoId} a las ${new Date().toISOString()}`);
  return fs.readFileSync(transcriptPath, 'utf-8').split('\n');
}

async function saveMetadata(videoId: string, transcript: string[]) {
  const outputDir = path.join('transcripciones', videoId);
  const metadataPath = path.join(outputDir, 'metadata.json');

  const metadata = await fetchVideoMetadata(videoId);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
}

async function runTranscriptionOnly() {
  try {
    const audioDir = 'audios';
    const files = fs.readdirSync(audioDir).filter(file => file.endsWith('.mp3'));

    const transcriptionPromises = files.map(file => limit(async () => {
      const videoId = path.basename(file, '.mp3');
      if (!transcriptExists(videoId)) {
        const audioPath = path.join(audioDir, file);
        const transcript = await transcribeAudio(videoId, audioPath);
        await saveMetadata(videoId, transcript);
      } else {
        console.log(`⏭️ Transcripción ya existe para ${videoId}`);
      }
    }));

    await Promise.all(transcriptionPromises);

    console.log('✅ Transcripción completa. Archivos generados en la carpeta "transcripciones".');
  } catch (err) {
    console.error('❌ Error general en transcripción:', err);
  }
}

runTranscriptionOnly();