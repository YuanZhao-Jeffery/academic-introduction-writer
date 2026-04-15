const express = require('express');
const cors = require('cors');
const path = require('path');
const papersRouter = require('./routes/papers');
const generateRouter = require('./routes/generate');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

app.use('/api/papers', papersRouter);
app.use('/api/generate', generateRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Research Tool API is running' });
});

// In production, serve the built React frontend
if (IS_PROD) {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  // All non-API routes return the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT} [${IS_PROD ? 'production' : 'development'}]`);
});
