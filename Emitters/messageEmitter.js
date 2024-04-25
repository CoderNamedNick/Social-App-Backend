const EventEmitter = require('events');

// Create a new instance of EventEmitter
const messageEmitter = new EventEmitter();

// Export the messageEmitter instance
module.exports = messageEmitter;