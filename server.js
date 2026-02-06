const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- "БАЗА ДАННЫХ" (в реальности лучше использовать MongoDB) ---
let usersData = {
  // Структура: [userId]: { characters: [], histories: { [charId]: [] } }
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Хелпер для получения данных пользователя
const getUser = (userId) => {
  if (!usersData[userId]) {
    usersData[userId] = { characters: [], histories: {} };
  }
  return usersData[userId];
};

// 1. Получить всех персонажей (общие + личные)
app.get('/api/characters', (req, res) => {
  const userId = req.query.userId;
  const user = getUser(userId);
  res.json({ userCharacters: user.characters });
});

// 2. Сохранить нового персонажа
app.post('/api/characters', (req, res) => {
  const { userId, character } = req.body;
  const user = getUser(userId);
  user.characters.push(character);
  res.json({ success: true });
});

// 3. Получить историю чата
app.get('/api/history', (req, res) => {
  const { userId, charId } = req.query;
  const user = getUser(userId);
  res.json(user.histories[charId] || []);
});

// 4. Основной чат с сохранением
app.post('/api/chat', async (req, res) => {
  const { userId, charId, messages, model, systemPrompt } = req.body;
  const user = getUser(userId);

  // Сохраняем историю на сервере
  user.histories[charId] = messages;

  try {
    const response = await axios({
      method: 'post',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        model: model || "arcee-ai/trinity-large-preview:free",
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
      },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'text/event-stream');
    
    // В реальном приложении нужно ловить конец стрима и записывать ответ бота в user.histories[charId]
    response.data.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
