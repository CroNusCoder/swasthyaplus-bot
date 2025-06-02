const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const admin = require('firebase-admin');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Firebase Setup
const serviceAccount = require('/opt/render/project/src/firebase-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Twilio Setup
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const MessagingResponse = twilio.twiml.MessagingResponse;

// WhatsApp Bot Reply Handler
app.post('/whatsapp', async (req, res) => {
  const incomingMsg = (req.body?.Body || '').trim().toLowerCase();
  const from = req.body.From;
  const twiml = new MessagingResponse();
  let reply = '';

  try {
    if (incomingMsg.startsWith('register')) {
      const parts = incomingMsg.split(' ');
      if (parts.length !== 4) {
        reply = `❗ Format: register <name> <age> <location>`;
      } else {
        const [_, name, age, location] = parts;
        await db.collection('users').doc(from).set({ name, age, location, coins: 0 });
        reply = `✅ Registered! Welcome ${name}.`;
      }
    } else if (incomingMsg === 'done') {
      const ref = db.collection('users').doc(from);
      const doc = await ref.get();
      if (doc.exists) {
        const current = doc.data().coins || 0;
        await ref.update({ coins: current + 10 });
        reply = `🎉 Task done! You earned 10 coins. Total: ${current + 10}`;
      } else {
        reply = `❗ You are not registered. Send: register <name> <age> <location>`;
      }
    } else {
      reply = `👋 Hi! Send:\nregister <name> <age> <location>\nOr reply 'done' after a task.`;
    }
    twiml.message(reply);
    res.type('text/xml').send(twiml.toString());
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    twiml.message("Oops! Something went wrong on our side.");
    res.type('text/xml').send(twiml.toString());
  }
});

// 🔁 Send Scheduled Messages to All Users
const sendToAll = async (msg) => {
  const users = await db.collection('users').get();
  users.forEach(user => {
    client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: user.id,
      body: msg
    });
  });
};

// 🕘 9 AM – Good morning + breakfast
cron.schedule('0 9 * * *', () => {
  sendToAll("🌞 Good morning! Did you have your breakfast?");
});

// 🕐 1 PM – Lunch check
cron.schedule('0 13 * * *', () => {
  sendToAll("🍱 Time to check — did you eat your lunch?");
});

// 🕕 6 PM – Gym or walk
cron.schedule('0 18 * * *', () => {
  sendToAll("💪 It's 6 PM! Ready for gym or a walk?");
});

// 🕘 9 PM – Dinner and step count
cron.schedule('0 21 * * *', () => {
  sendToAll("🌙 Did you have dinner? Don't forget to track your steps!");
});

// Start server and print live status
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp bot is live and listening on port ${PORT}`);
});
