import { exec } from 'child_process';
import path from 'path';

export default function handler(req, res) {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const scriptPath = path.join(process.cwd(), 'scripts', 'webscraping.py');

  exec(`python ${scriptPath} ${url}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error}`);
      return res.status(500).json({ error: 'Failed to execute script' });
    }
    console.log(`Output: ${stdout}`);

    try {
      const reviews = JSON.parse(stdout); // Ensure your Python script outputs JSON
      res.status(200).json(reviews);
    } catch (parseError) {
      console.error(`Parsing error: ${parseError}`);
      res.status(500).json({ error: 'Failed to parse script output' });
    }
  });
}
