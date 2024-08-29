import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Initialize Pinecone and OpenAI
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

const index = pc.index('rag').namespace('ns1');

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY,
  dangerouslyAllowBrowser: true,
});

export async function POST(req: any) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'webscraping.py');

    return new Promise((resolve, reject) => {
      exec(`python ${scriptPath} ${url}`, async (error, stdout, stderr) => {
        if (error) {
          console.error(`Execution error: ${error}`);
          return resolve(NextResponse.json({ error: 'Failed to execute script' }, { status: 500 }));
        }

        try {
          const reviews = JSON.parse(stdout);

          // Process reviews and upload to Pinecone
          for (const review of reviews) {
            const text = review.review;

            // Get the text embedding from OpenAI
            const embedding = await openai.embeddings.create({
              model: 'text-embedding-ada-002',
              input: text,
            });

            // Insert into Pinecone
            await index.upsert([
              {
                id: review.professor,  // or some unique identifier
                values: embedding.data[0].embedding,
                metadata: {
                  subject: review.subject,
                  rating: review.rating,
                  date: review.date,
                }
              }
            ]);
          }

          resolve(NextResponse.json({ message: 'Data uploaded successfully to Pinecone' }));
        } catch (parseError) {
          console.error(`Parsing error: ${parseError}`);
          resolve(NextResponse.json({ error: 'Failed to parse script output' }, { status: 500 }));
        }
      });
    });
  } catch (err) {
    console.error(`Request error: ${err}`);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
