const { spawn } = require('child_process');
const { promisify } = require('util');

// Function to run yt-dlp
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const process = spawn('yt-dlp', args);
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

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Search YouTube for music
    const output = await runYtDlp([
      'ytsearch10:"' + query + '"',
      '--dump-json',
      '--playlist-end', '10'
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

    res.status(200).json(videos);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
};