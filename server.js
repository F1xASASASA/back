const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Разрешаем CORS, чтобы фронтенд (ВК/Локалхост) мог делать запросы
app.use(cors());
app.use(express.json());

// --- ГЛОБАЛЬНЫЕ ДАННЫЕ (Хранятся в памяти сервера) ---
// Примечание: На бесплатном Render данные сбросятся при перезагрузке сервера
let globalCharacters = [
  { 
    id: 'elon_default', 
    name: 'Elon Musk', 
    author: '@system', 
    desc: 'Визионер, Марс, Tesla', 
    avatar: 'https://nonews.co/wp-content/uploads/2022/05/elon-musk-portrait.jpg', 
    prompt: 'Ты Илон Маск. Говори про космос, мемы и технологии.' 
  },
  { 
    id: 'geralt_default', 
    name: 'Геральт', 
    author: '@system', 
    desc: 'Ведьмак из Ривии', 
    avatar: 'https://images.steamusercontent.com/ugc/924805934474316745/E44AC605B446C8420FF450DDDEB428BC89D16BC8/', 
    prompt: 'Ты Геральт из Ривии. Твоя речь скупая и циничная. Используй "Зараза", "Хмм".' 
  }
];

let globalScenarios = [
  { 
    id: 's1', 
    name: 'Konoha High', 
    author: '@system',
    desc: 'Школа ниндзя в современном мире', 
    avatar: 'https://i.pravatar.cc/300?u=s1', 
    prompt: 'Действие происходит в современной школе ниндзя в Конохе. Персонажи — ученики или учителя.' 
  },
  { 
    id: 's2', 
    name: 'Zombie Survival', 
    author: '@system',
    desc: 'Мир после апокалипсиса', 
    avatar: 'https://i.pravatar.cc/300?u=s2', 
    prompt: 'Вокруг зомби-апокалипсис. Ресурсов мало, повсюду опасность.' 
  }
];

// Хранилище историй: { "userId_chatId": [messages] }
let userHistories = {};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// --- API ЭНДПОИНТЫ ---

// 1. Получить всех персонажей
app.get('/api/characters', (req, res) => {
  res.json(globalCharacters);
});

// 2. Создать персонажа (доступно всем)
app.post('/api/characters', (req, res) => {
  const { character } = req.body;
  if (!character.name || !character.avatar.startsWith('https://')) {
    return res.status(400).json({ error: "Невалидные данные" });
  }
  globalCharacters.push(character);
  res.json({ success: true, allCharacters: globalCharacters });
});

// 3. Получить все сценарии
app.get('/api/scenarios', (req, res) => {
  res.json(globalScenarios);
});

// 4. Создать сценарий (доступно всем)
app.post('/api/scenarios', (req, res) => {
  const { scenario } = req.body;
  if (!scenario.name || !scenario.avatar.startsWith('https://')) {
    return res.status(400).json({ error: "Невалидные данные" });
  }
  globalScenarios.push(scenario);
  res.json({ success: true, allScenarios: globalScenarios });
});

// 5. Получить личную историю чата
app.get('/api/history', (req, res) => {
  const { userId, charId } = req.query;
  const key = `${userId}_${charId}`;
  res.json(userHistories[key] || []);
});

// 6. Основной чат с нейросетью (Streaming)
app.post('/api/chat', async (req, res) => {
  const { userId, charId, messages, systemPrompt, model } = req.body;
  
  // Сохраняем историю на сервере
  const key = `${userId}_${charId}`;
  userHistories[key] = messages;

  try {
    const response = await axios({
      method: 'post',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vk.com',
        'X-Title': 'Character AI VK Clone',
      },
      data: {
        model: model || "arcee-ai/trinity-large-preview:free",
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      },
      responseType: 'stream'
    });

    // Пробрасываем поток данных от OpenRouter к нашему фронтенду
    res.setHeader('Content-Type', 'text/event-stream');
    response.data.pipe(res);

    // Логика захвата ответа для сохранения в историю (опционально)
    let fullResponse = "";
    response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                    const data = JSON.parse(line.slice(6));
                    fullResponse += data.choices[0].delta.content || "";
                } catch(e) {}
            }
        }
    });

    response.data.on('end', () => {
        // Когда поток закончился, добавляем ответ бота в историю на сервере
        userHistories[key].push({ role: 'assistant', content: fullResponse });
    });

  } catch (error) {
    console.error("OpenRouter Error:", error.message);
    res.status(500).json({ error: "Ошибка нейросети" });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});


