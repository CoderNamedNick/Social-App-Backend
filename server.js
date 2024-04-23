const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Require bcrypt
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const http = require('http'); // Import http module

// Import route handlers
const userRouter = require('./routes/Users');
const guildRouter = require('./routes/Guilds');
const messageRouter = require('./routes/Messages')

// Create Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes

app.use('/Users', userRouter);
app.use('/Guilds', guildRouter);
app.use('/Messages', messageRouter);

// Database connection
mongoose.connect('mongodb://localhost:27017/Social-App', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');

  // Create HTTP server
  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`HTTP Server is running on port ${PORT}`);
  });

  // WebSocket server
  const wss = new WebSocket.Server({ noServer: true }); // Create WebSocket server without attaching it to the HTTP server

  // Global variable to store message count
  let messageCount = 0;

  // Function to broadcast message count to all clients
  const broadcastMessageCount = () => {
    const message = JSON.stringify({ count: messageCount });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Handle WebSocket connections
  wss.on('connection', ws => {
    console.log('New WebSocket connection');

    // Send current message count to the new client
    ws.send(JSON.stringify({ count: messageCount }));

    // Handle incoming messages
    ws.on('message', message => {
      console.log('Received message:', message);
      // Update message count and broadcast to all clients
      messageCount++;
      broadcastMessageCount();
    });
  });

  // Upgrade HTTP server to WebSocket server
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request);
    });
  });
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});