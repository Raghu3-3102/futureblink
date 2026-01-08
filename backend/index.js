const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB Schema
const flowSchema = new mongoose.Schema({
    prompt: String,
    response: String,
    createdAt: { type: Date, default: Date.now }
});

const Flow = mongoose.model('Flow', flowSchema);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.post('/api/ask-ai', async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,          // 👈 VERY IMPORTANT
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000', // optional but recommended
          'X-Title': 'My AI App'
        }
      }
    );

    res.json({
      response: response.data.choices[0].message.content
    });

  } catch (error) {
    console.error('AI API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch AI response' });
  }
});


app.post('/api/save-flow', async (req, res) => {
    const { prompt, response } = req.body;

    try {
        const newFlow = new Flow({ prompt, response });
        await newFlow.save();
        res.json({ message: 'Flow saved successfully', data: newFlow });
    } catch (error) {
        console.error('DB save error:', error);
        res.status(500).json({ error: 'Failed to save flow' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
