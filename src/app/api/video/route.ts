import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync, existsSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { Storage } from '@google-cloud/storage';

export const dynamic = 'force-dynamic';

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function nodeStreamToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (error) => {
        controller.error(error);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}

async function getVideoFromObjectStorage(range?: { start: number; end: number }): Promise<{
  stream: Readable;
  size: number;
} | null> {
  const publicPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS;
  
  if (!publicPaths) {
    return null;
  }

  const searchPaths = publicPaths.split(',').map(p => p.trim()).filter(p => p.length > 0);
  const videoFilenames = ["loadingg.mp4", "loading.mp4"];

  for (const searchPath of searchPaths) {
    for (const filename of videoFilenames) {
      try {
        const fullPath = `${searchPath}/${filename}`;
        const { bucketName, objectName } = parseObjectPath(fullPath);

        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);

        const [exists] = await file.exists();

        if (exists) {
          const [metadata] = await file.getMetadata();
          const fileSize = Number(metadata.size) || 0;

          const streamOptions: { start?: number; end?: number } = {};
          if (range) {
            streamOptions.start = range.start;
            streamOptions.end = range.end;
          }

          const stream = file.createReadStream(streamOptions);
          return { stream, size: fileSize };
        }
      } catch (error) {
        // Silently continue to next file/path
      }
    }
  }
  return null;
}

function getLocalVideoStream(range?: { start: number; end: number }): {
  stream: Readable;
  size: number;
} | null {
  const videoPath = join(process.cwd(), 'public', 'race', 'loading.mp4');

  if (!existsSync(videoPath)) {
    return null;
  }

  const stat = statSync(videoPath);
  const fileSize = stat.size;

  const streamOptions: { start?: number; end?: number } = {};
  if (range) {
    streamOptions.start = range.start;
    streamOptions.end = range.end;
  }

  const stream = createReadStream(videoPath, streamOptions);
  return { stream, size: fileSize };
}

export async function GET(request: NextRequest) {
  try {
    const rangeHeader = request.headers.get('range');

    let videoSource = await getVideoFromObjectStorage();

    if (!videoSource) {
      console.log('Object Storage not available or file not found, using local file');
      videoSource = getLocalVideoStream();
    }

    if (!videoSource) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const { size: fileSize } = videoSource;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024, fileSize - 1);

      if (start >= fileSize || start < 0) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const range = { start, end };

      let streamWithRange = await getVideoFromObjectStorage(range);
      if (!streamWithRange) {
        streamWithRange = getLocalVideoStream(range);
      }

      if (!streamWithRange) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      const chunkSize = end - start + 1;
      const webStream = nodeStreamToWebStream(streamWithRange.stream);

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } else {
      const webStream = nodeStreamToWebStream(videoSource.stream);

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch (error) {
    console.error('Error serving video:', error);
    return NextResponse.json({ error: 'Video error' }, { status: 500 });
  }
}
