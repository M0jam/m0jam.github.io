require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const { stringify } = require('csv-stringify');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, '../data/feedback.json');
const API_KEY = 'playhub-secret-key'; // In production, use env vars
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined'));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Validation Schema
const feedbackSchema = Joi.object({
  type: Joi.string().valid('bug', 'feature', 'general').required(),
  content: Joi.string().min(10).max(1000).required(),
  rating: Joi.number().min(1).max(5).optional(),
  contactEmail: Joi.string().email().allow('').optional(),
  sendToDiscord: Joi.boolean().optional()
});

// Helper to read/write data
const getFeedback = () => JSON.parse(fs.readFileSync(DATA_FILE));
const saveFeedback = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// API Endpoints

// Submit Feedback
app.post('/api/feedback', (req, res) => {
  // Simple API Key check
  const authHeader = req.headers['x-api-key'];
  if (authHeader !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validation
  const { error, value } = feedbackSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { sendToDiscord, ...cleanValue } = value;

  const feedback = getFeedback();
  const newEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    ...cleanValue
  };

  feedback.push(newEntry);
  saveFeedback(feedback);

  const shouldSendToDiscord = sendToDiscord !== false;

  if (DISCORD_WEBHOOK_URL && shouldSendToDiscord) {
    const typeLabel = newEntry.type.charAt(0).toUpperCase() + newEntry.type.slice(1);
    const typeColor =
      newEntry.type === 'bug'
        ? 15548997
        : newEntry.type === 'feature'
        ? 5763719
        : 3447003;

    const payload = {
      embeds: [
        {
          title: `New PlayHub ${typeLabel} Feedback`,
          description: newEntry.content,
          color: typeColor,
          fields: [
            {
              name: 'Type',
              value: typeLabel,
              inline: true
            },
            {
              name: 'Rating',
              value: newEntry.rating != null ? String(newEntry.rating) : 'N/A',
              inline: true
            },
            {
              name: 'Contact Email',
              value: newEntry.contactEmail || 'Not provided',
              inline: true
            },
            {
              name: 'Source',
              value: 'PlayHub Desktop App',
              inline: true
            }
          ],
          footer: {
            text: `Feedback ID: ${newEntry.id}`
          },
          timestamp: newEntry.timestamp
        }
      ]
    };

    fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  res.status(201).json({ success: true, id: newEntry.id });
});

// Get Feedback (Protected)
app.get('/api/feedback', (req, res) => {
  // Basic Auth for dashboard API
  const auth = { login: 'admin', password: 'password' }; // Simple for local demo
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login && password && login === auth.login && password === auth.password) {
    return res.json(getFeedback());
  }

  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required.');
});

// Export CSV
app.get('/api/feedback/export', (req, res) => {
    // Basic Auth check (same as above)
    const auth = { login: 'admin', password: 'password' };
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  
    if (!login || !password || login !== auth.login || password !== auth.password) {
      res.set('WWW-Authenticate', 'Basic realm="401"');
      return res.status(401).send('Authentication required.');
    }

  const feedback = getFeedback();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="feedback.csv"');

  stringify(feedback, {
    header: true,
    columns: ['id', 'timestamp', 'type', 'rating', 'content', 'contactEmail', 'userAgent', 'ip']
  }).pipe(res);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Support Server running on http://localhost:${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}/dashboard.html`);
});
