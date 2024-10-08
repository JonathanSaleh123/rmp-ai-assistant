'use client'
import { Box, Button, Stack, TextField } from '@mui/material'
import { useState } from 'react'


export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ])
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        throw new Error('Failed to scrape and upload data');
      }

      const data = await res.json();
      setResponse(data.message);
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false);
    }
  };


  const sendMessage = async () => {
    // Add the user message to the chat
    setMessage('');
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);
  
    // Fetch the response from the server
    const response = fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([...messages, { role: 'user', content: message }]),
    }).then(async (res) => {
      // Add the response to the chat
      if (!res.body) {
        throw new Error('Response body is null');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = '';
  
      // Read the response as a stream
      return reader.read().then(function processText({ done, value }: ReadableStreamReadResult<Uint8Array>): string | Promise<string> {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), { stream: true });
        result += text;
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: result },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };
  
  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Stack
        direction={'column'}
        width="500px"
        height="700px"
        border="1px solid black"
        p={2}
        spacing={3}
      >
        <Stack
        direction={'column'}
        spacing={2}
        flexGrow={1}
        overflow="auto"
        maxHeight="100%"
        >
        {messages.map((message, index) => (
        <Box
          key={index}
          display="flex"
          justifyContent={
            message.role === 'assistant' ? 'flex-start' : 'flex-end'
          }
        >
          <Box
            bgcolor={
              message.role === 'assistant'
                ? 'primary.main'
                : 'secondary.main'
            }
            color="white"
            borderRadius={16}
            p={3}
            whiteSpace="pre-wrap" 
          >
            {message.content}
          </Box>
        </Box>
        ))}
        </Stack>
        
        {/* RMP Link Input */}
        <Stack direction={'column'} spacing={2} marginTop={2}>
          <TextField
            label="Rate My Professor Link"
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste the link here"
            required
          />
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Submit'}
          </Button>
          {response && <p style={{ color: 'green' }}>{response}</p>}
        </Stack>

        <Stack direction={'row'} spacing={2} marginTop={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button variant="contained" onClick={sendMessage}>
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}