import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import FormData from 'form-data';

// Route segment config for large file uploads
export const maxDuration = 180; // 3 minutes max for file processing
export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

/**
 * Converts audio file to MP3 format compatible with WhatsApp via Chatwoot
 * 
 * IMPORTANT: Chatwoot has a bug (#12713) where it changes 'audio/ogg; codecs=opus'
 * to 'audio/opus' which WhatsApp rejects with error 131053.
 * 
 * Solution: Convert to MP3 (audio/mpeg) which WhatsApp fully supports
 * and Chatwoot doesn't modify the MIME type.
 * 
 * WhatsApp supported audio formats: audio/mpeg, audio/ogg; codecs=opus, audio/amr, audio/mp4, audio/aac
 */
async function convertAudioForWhatsApp(audioBuffer: Buffer, originalName: string): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
  const timestamp = Date.now();
  const inputPath = join(tmpdir(), `input-${timestamp}-${originalName}`);
  const outputPath = join(tmpdir(), `output-${timestamp}.mp3`);

  try {
    // Write input file
    await writeFile(inputPath, audioBuffer);

    // Convert to MP3 using FFmpeg
    // -ar 44100: Standard sample rate for MP3
    // -ac 1: mono channel
    // -b:a 64k: 64kbps bitrate (good quality for voice)
    // -f mp3: Force MP3 format
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -ar 44100 -ac 1 -b:a 64k -f mp3 -y "${outputPath}" 2>&1`;
    
    console.log('[Audio Conversion] Converting to MP3 (bypassing Chatwoot OGG bug)...');
    console.log('[Audio Conversion] Input:', originalName, 'Size:', audioBuffer.length, 'bytes');
    
    try {
      const { stdout, stderr } = await execAsync(ffmpegCommand);
      if (stderr) {
        console.log('[Audio Conversion] FFmpeg output:', stderr.slice(-300));
      }
    } catch (ffmpegError: any) {
      console.error('[Audio Conversion] FFmpeg error:', ffmpegError.message);
      // FFmpeg returns non-zero even on success sometimes, check if output exists
      try {
        const convertedBuffer = await readFile(outputPath);
        if (convertedBuffer.length > 0) {
          console.log('[Audio Conversion] FFmpeg completed despite error, output size:', convertedBuffer.length);
          return {
            buffer: convertedBuffer,
            filename: `voice-${timestamp}.mp3`,
            mimeType: 'audio/mpeg'
          };
        }
      } catch {
        // Output file doesn't exist, conversion really failed
      }
      return null;
    }

    // Read converted file
    const convertedBuffer = await readFile(outputPath);
    
    console.log(`[Audio Conversion] Success: ${audioBuffer.length} bytes -> ${convertedBuffer.length} bytes (MP3)`);
    
    return {
      buffer: convertedBuffer,
      filename: `voice-${timestamp}.mp3`,
      mimeType: 'audio/mpeg'
    };
  } catch (error) {
    console.error('[Audio Conversion] Error:', error);
    return null;
  } finally {
    // Cleanup temp files
    try {
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Check if a file is an audio file that needs conversion for WhatsApp
 * We convert ALL audio types to ensure proper OGG Opus encoding for WhatsApp
 */
function isAudioFile(file: File): boolean {
  // Include audio/ogg to ensure it's properly encoded with Opus codec
  const audioTypes = ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/opus'];
  const isAudio = audioTypes.some(type => file.type.startsWith(type.split(';')[0])) || file.type.includes('audio');
  console.log(`[Audio Check] File: ${file.name}, Type: ${file.type}, IsAudio: ${isAudio}`);
  return isAudio;
}

export async function POST(request: NextRequest) {
  const CHATWOOT_API_URL = process.env.CHATWOOT_API_URL;
  const CHATWOOT_APP_ACCESS_TOKEN = process.env.CHATWOOT_APP_ACCESS_TOKEN;
  const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID;

  // Helper to normalize the API URL
  const getNormalizedApiUrl = (url: string) => {
    let normalized = url.trim();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    // Chatwoot API usually requires /api/v1 prefix
    if (!normalized.includes('/api/v1')) {
      normalized = `${normalized}/api/v1`;
    }
    return normalized;
  };
  
  try {
    // Verificar autenticación del usuario
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();

    const conversationId = formData.get('conversationId') as string;
    const content = formData.get('content') as string;
    const messageType = (formData.get('messageType') as string) || 'outgoing';
    const isPrivate = formData.get('private') === 'true';
    const attachments = formData.getAll('attachments') as File[];
    const workspaceId = formData.get('workspaceId') as string;

    // Validate required fields - content is optional if attachments are present
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { error: 'Either content or attachments are required' },
        { status: 400 }
      );
    }

    if (!CHATWOOT_API_URL || !CHATWOOT_APP_ACCESS_TOKEN) {
      console.error('CHATWOOT_API_URL or CHATWOOT_APP_ACCESS_TOKEN is missing');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      );
    }

    const apiUrl = getNormalizedApiUrl(CHATWOOT_API_URL);

    // Obtener los canales del usuario filtrados por workspace
    const { data: userChannels, error: channelsError } = await supabase
      .from('user_chatwoot_channels')
      .select('chatwoot_inbox_id, chatwoot_account_id')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (channelsError) {
      console.error('Error fetching user channels:', channelsError);
      return NextResponse.json(
        { error: 'Error al obtener canales del usuario' },
        { status: 500 }
      );
    }

    if (!userChannels || userChannels.length === 0) {
      return NextResponse.json(
        { error: 'No tienes canales asociados' },
        { status: 403 }
      );
    }

    // El Account ID correcto es 1
    const accountId = 1;
    const userInboxIds = userChannels.map(ch => ch.chatwoot_inbox_id);

    // Verificar que la conversación pertenece a un inbox del usuario
    const convTargetUrl = `${apiUrl}/accounts/${accountId}/conversations/${conversationId}`;
    const convResponse = await axios.get(
      convTargetUrl,
      {
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': CHATWOOT_APP_ACCESS_TOKEN,
        },
      }
    );

    const conversation = convResponse.data;
    
    if (!userInboxIds.includes(conversation.inbox_id)) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta conversación' },
        { status: 403 }
      );
    }

    // Create FormData for Chatwoot API using form-data package (production compatible)
    const chatwootFormData = new FormData();
    
    // Only add content if it's not empty
    if (content && content.trim()) {
      chatwootFormData.append('content', content.trim());
    }
    
    chatwootFormData.append('message_type', messageType);
    chatwootFormData.append('private', isPrivate.toString());

    // Add attachments if present - use Buffer directly with form-data package
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        // Convert File to Buffer for axios
        const arrayBuffer = await file.arrayBuffer();
        let buffer: Buffer = Buffer.from(arrayBuffer);
        let fileName = file.name;
        let mimeType = file.type;
        
        // Check if this is an audio file that needs conversion for WhatsApp
        if (isAudioFile(file)) {
          console.log(`[Audio] Detected audio file: ${file.name} (${file.type}), attempting conversion...`);
          
          const converted = await convertAudioForWhatsApp(buffer, file.name);
          
          if (converted) {
            buffer = converted.buffer;
            fileName = converted.filename;
            mimeType = converted.mimeType;
            console.log(`[Audio] Conversion successful: ${fileName} (${mimeType})`);
          } else {
            console.log(`[Audio] Conversion failed or FFmpeg not available, trying to send as-is`);
            // If conversion fails, keep original format - may still work for MP3/other formats
            // But warn that it might not work with WhatsApp
            console.warn(`[Audio] Warning: Audio may not be compatible with WhatsApp. Install FFmpeg for proper conversion.`);
          }
        }
        
        // Append Buffer directly with proper options (form-data package handles this correctly)
        chatwootFormData.append('attachments[]', buffer, {
          filename: fileName,
          contentType: mimeType,
          knownLength: buffer.length
        });
      }
    }

    console.log(`[Chatwoot] User ${user.id} sending message to conversation ${conversationId} with ${attachments.length} attachments`);

    const msgTargetUrl = `${apiUrl}/accounts/${accountId}/conversations/${conversationId}/messages`;
    
    // Get form-data headers (includes Content-Type with boundary)
    const formHeaders = chatwootFormData.getHeaders();
    
    const response = await axios.post(
      msgTargetUrl,
      chatwootFormData,
      {
        headers: {
          ...formHeaders,
          'api_access_token': CHATWOOT_APP_ACCESS_TOKEN,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 180000, // 3 minute timeout for large files in slow production environments
      }
    );

    console.log('[Chatwoot] Message sent successfully:', response.data);
    return NextResponse.json({
      success: true,
      message: response.data,
    }, { status: 200 });

  } catch (error) {
    console.error('Error sending message:', error);
    
    if (axios.isAxiosError(error)) {
      const targetUrl = CHATWOOT_API_URL ? getNormalizedApiUrl(CHATWOOT_API_URL) : 'unknown';
      const accountIdForLog = error.config?.url || 'unknown';
      console.error(`[Chatwoot] API Error at ${accountIdForLog}`);
      console.error('[Chatwoot] Status:', error.response?.status);
      console.error('[Chatwoot] Response Body:', JSON.stringify(error.response?.data, null, 2));
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      const statusCode = error.response?.status || 500;
      
      return NextResponse.json(
        { 
          error: `Failed to send message: ${errorMessage}`,
          details: error.response?.data,
          api_url: `...${targetUrl.slice(-20)}`
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}