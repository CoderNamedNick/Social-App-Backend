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
  const server = http.createServer(app); // Create HTTP server
  server.listen(PORT, () => {
    console.log(`HTTP Server is running on port ${PORT}`);
  });

  // Create WebSocket server
  const wss = new WebSocket.Server({ server });

  // Handle WebSocket connections
  wss.on('connection', ws => {
    console.log('New WebSocket connection');

    // Handle incoming messages
    ws.on('message', message => {
      console.log('Received message:', message);
      // Broadcast the message to all connected clients
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
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