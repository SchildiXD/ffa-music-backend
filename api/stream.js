const { spawn } = require('child_process');

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
    const videoId = req.query.id;
    if (!videoId) {
      return res.status(400).json({ error: 'ID parameter is required' });
    }

    // Get direct audio URL
    const output = await runYtDlp([
      `https://www.youtube.com/watch?v=${videoId}`,
      '-g', // Get URL only
      '-f', 'bestaudio[ext=mp4]'
    ]);

    const audioUrl = output.trim();
    res.status(200).json({ audioUrl });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to get audio stream' });
  }
};