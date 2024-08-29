import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'


const systemPrompt = `
You are a rate my professor agent to help students find classes, that takes in user questions and answers them.
For every user question, the top 3 professors that match the user question are returned.
Use them to answer the question if needed.
`
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || '',
  })

const index = pc.index('rag').namespace('ns1')
const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY, 
    dangerouslyAllowBrowser: true,
})

export async function POST(req: any) {
    const data = await req.json()
    const text = data[data.length - 1].content
    // Get the text embedding from OpenAI
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
    })
    // Query the Pinecone index
    const results = await index.query({
        topK: 5,
        includeMetadata: true,
        vector: embedding.data[0].embedding,
      })

    let resultString = ''
    //Format Results
    results.matches.forEach((match) => {
    resultString += `
    Returned Results:
    Professor: ${match.id}
    Review: ${match.metadata?.stars ?? 'N/A'}
    Subject: ${match.metadata?.subject ?? 'N/A'}
    Stars: ${match.metadata?.stars ?? 'N/A'}
    \n\n`
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1)


    // Get the completion from OpenAI
    const completion = await openai.chat.completions.create({
        messages: [
          {role: 'system', content: systemPrompt},
          ...lastDataWithoutLastMessage,
          {role: 'user', content: lastMessageContent},
        ],
        model: 'gpt-3.5-turbo',
        stream: true,
      })
    // Return the completion as a stream
    const stream = new ReadableStream({
    async start(controller) {
        const encoder = new TextEncoder()
        try {
        for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
            const text = encoder.encode(content)
            controller.enqueue(text)
            }
        }
        } catch (err) {
        controller.error(err)
        } finally {
        controller.close()
        }
    },
    })
    return new NextResponse(stream)
    
}