import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

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

function transcribeAudio(videoId: string, audioPath: string): string[] {
  const outputDir = path.join('transcripciones', videoId);
  const rawTranscript = path.join(outputDir, `${videoId}.txt`);
  const transcriptPath = path.join(outputDir, 'transcription.txt');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`🗣️ Transcribiendo ${videoId}`);
    const command = `whisper "${audioPath}" --language Spanish --model base --output_format txt --output_dir ${outputDir}`;
  // const command = `whisper "${audioPath}" --language Spanish --model medium --device cuda --output_format txt --output_dir ${outputDir}`;
  execSync(command, { stdio: 'inherit' });

  if (!fs.existsSync(rawTranscript)) {
    throw new Error(`❌ Whisper no generó el archivo esperado: ${rawTranscript}`);
  }
  
  // Renombrar a transcription.txt
  fs.renameSync(rawTranscript, transcriptPath);

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

    for (const file of files) {
      const videoId = path.basename(file, '.mp3');
      if (!transcriptExists(videoId)) {
        const audioPath = path.join(audioDir, file);
        const transcript = transcribeAudio(videoId, audioPath);
        await saveMetadata(videoId, transcript);
      } else {
        console.log(`⏭️ Transcripción ya existe para ${videoId}`);
      }
    }
    console.log('✅ Transcripción completa. Archivos generados en la carpeta "transcripciones".');
  } catch (err) {
    console.error('❌ Error general en transcripción:', err);
  }
}

runTranscriptionOnly();