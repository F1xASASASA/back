const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- ГЛОБАЛЬНАЯ БАЗА ДАННЫХ ---
const DEFAULT_DATA = [
  { id: '1', name: 'Нептун', author: '@LEKCYXA', desc: 'Нептун и Уран>', avatar: 'https://i.pravatar.cc/150?u=1', prompt: 'Ты Нептун.' },
  { id: '2', name: 'EKAANSH', author: '@chiku_X8', desc: 'REPLACE GROOM', avatar: 'https://i.pravatar.cc/150?u=2', prompt: 'You are Ekaansh.' }
];

// Все созданные персонажи теперь здесь
let globalCharacters = [...DEFAULT_DATA];
// Истории по-прежнему привязаны к пользователям
let userHistories = {}; 

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// 1. Получить ВСЕХ персонажей для ВСЕХ
app.get('/api/characters', (req, res) => {
  res.json(globalCharacters);
});

// 2. Создать персонажа (он добавится в общий список)
app.post('/api/characters', (req, res) => {
  const { character } = req.body;
  // Проверяем, нет ли уже такого ID
  if (!globalCharacters.find(c => c.id === character.id)) {
    globalCharacters.push(character);
  }
  res.json({ success: true, allCharacters: globalCharacters });
});

// 3. Получить историю (индивидуально для каждого юзера)
app.get('/api/history', (req, res) => {
  const { userId, charId } = req.query;
  const key = `${userId}_${charId}`;
  res.json(userHistories[key] || []);
});

// 4. Чат
app.post('/api/chat', async (req, res) => {
  const { userId, charId, messages, systemPrompt } = req.body;
  const key = `${userId}_${charId}`;
  
  userHistories[key] = messages;

  try {
    const response = await axios({
      method: 'post',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      data: {
        model: "arcee-ai/trinity-large-preview:free",
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
      },
      responseType: 'stream'
    });
    res.setHeader('Content-Type', 'text/event-stream');
    response.data.pipe(res);
  } catch (error) { res.status(500).send(error.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
