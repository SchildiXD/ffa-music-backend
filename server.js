const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const process = spawn('yt-dlp', args, { timeout: 25000 }); // 25 second timeout
    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(error || `Process exited with code ${code}`));
      }
    });
  });
}

// Search endpoint
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const output = await runYtDlp([
      'ytsearch5:"' + query + '"',
      '--dump-json',
      '--playlist-end', '5'
    ]);

    const videos = output
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const video = JSON.parse(line);
        return {
          id: video.id,
          title: video.title,
          artist: video.uploader,
          thumbnail: video.thumbnail,
          duration: video.duration,
          url: `https://www.youtube.com/watch?v=${video.id}`
        };
      });

    res.json(videos);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

// Stream endpoint
app.get('/stream', async (req, res) => {
  try {
    const videoId = req.query.id;
    if (!videoId) {
      return res.status(400).json({ error: 'ID parameter is required' });
    }

    const output = await runYtDlp([
      `https://www.youtube.com/watch?v=${videoId}`,
      '-g', // Get URL only
      '-f', 'bestaudio[ext=mp4]'
    ]);

    const audioUrl = output.trim();
    res.json({ audioUrl });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to get audio stream' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});