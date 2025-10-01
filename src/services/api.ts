const API_BASE_URL = 'http://localhost:3001/api';

export interface TranscriptionResponse {
  success: boolean;
  transcript?: string;
  error?: string;
  message?: string;
}

export interface ProfileGenerationResponse {
  success: boolean;
  summary?: string;
  error?: string;
  message?: string;
}

export interface QuestionAnswer {
  sectionId: string;
  question: string;
  transcript: string;
}

/**
 * Upload audio file and get transcription from AssemblyAI
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    console.log('[API] Starting transcription for:', audioUri);

    // Create FormData for multipart upload
    const formData = new FormData();

    // Extract filename from URI
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    console.log('[API] Filename:', filename);

    // Add audio file to form data
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: filename,
    } as any);

    console.log('[API] Sending request to:', `${API_BASE_URL}/transcribe`);
    const response = await fetch(`${API_BASE_URL}/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('[API] Response status:', response.status);
    const data: TranscriptionResponse = await response.json();
    console.log('[API] Response data:', data);

    if (!data.success || !data.transcript) {
      throw new Error(data.error || 'Transcription failed');
    }

    console.log('[API] Transcript received:', data.transcript.substring(0, 50));
    return data.transcript;
  } catch (error) {
    console.error('[API] Transcription API error:', error);
    throw error;
  }
}

/**
 * Generate AI profile summary from transcribed answers
 */
export async function generateProfile(
  answers: QuestionAnswer[],
  options?: { maxWords?: number; style?: 'professional' | 'casual' | 'narrative' }
): Promise<string> {
  try {
    console.log('[API] Generating profile from', answers.length, 'answers');

    const response = await fetch(`${API_BASE_URL}/profile/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answers, options }),
    });

    const data: ProfileGenerationResponse = await response.json();

    if (!data.success || !data.summary) {
      throw new Error(data.error || 'Profile generation failed');
    }

    console.log('[API] Profile generated successfully');
    return data.summary;
  } catch (error) {
    console.error('[API] Profile generation error:', error);
    throw error;
  }
}