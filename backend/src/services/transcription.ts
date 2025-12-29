import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

/**
 * Transcribe audio from a buffer (memory-only, no disk writes)
 */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  _filename: string
): Promise<string> {
  try {
    // Upload buffer directly to AssemblyAI
    const uploadUrl = await client.files.upload(buffer);

    // Transcribe from uploaded URL
    const transcript = await client.transcripts.transcribe({
      audio: uploadUrl,
    });

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    if (!transcript.text || transcript.text.trim() === '') {
      console.error('Empty transcript received from AssemblyAI');
      console.error('Transcript object:', JSON.stringify(transcript, null, 2));
      throw new Error('Transcription returned empty text - audio may be silent or too short');
    }

    return transcript.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}