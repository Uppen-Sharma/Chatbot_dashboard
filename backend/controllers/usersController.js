const { readDB, writeDB } = require("../utils/db");

const getUsers = (req, res) => {
  res.json(readDB().users || []);
};

const deleteUser = (req, res) => {
  const { userId } = req.params;
  let db = readDB();

  // 1. Remove associated chat messages
  const userChats = db.userChats[userId] || [];
  userChats.forEach((chat) => {
    if (db.chatMessages[chat.id]) {
      delete db.chatMessages[chat.id];
    }
  });

  // 2. Remove user chat entries
  if (db.userChats[userId]) {
    delete db.userChats[userId];
  }

  // 3. Remove user from users list
  db.users = (db.users || []).filter((u) => u.id !== userId);

  // 4. Persist to file
  writeDB(db);

  res.json({ success: true, message: `User ${userId} and all related data deleted.` });
};

const getUserChats = (req, res) => {
  res.json(readDB().userChats[req.params.userId] || []);
};

const getChatMessages = (req, res) => {
  res.json(readDB().chatMessages[req.params.chatId] || []);
};

module.exports = {
  getUsers,
  deleteUser,
  getUserChats,
  getChatMessages,
};
