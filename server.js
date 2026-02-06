// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors()); // Чтобы ВК разрешил запросы к твоему серверу
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model } = req.body;

        const response = await axios({
            method: 'post',
            url: 'https://openrouter.ai/api/v1/chat/completions',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://vk.com', // Для статистики OpenRouter
                'X-Title': 'Character AI VK',
            },
            data: {
                model: model || "arcee-ai/trinity-large-preview:free",
                messages: messages,
                stream: true, // Включаем стриминг
            },
            responseType: 'stream' // Важно для проброса потока текста
        });

        // Пробрасываем поток текста от OpenRouter напрямую клиенту
        res.setHeader('Content-Type', 'text/event-stream');
        response.data.pipe(res);

    } catch (error) {
        console.error('Ошибка:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});