const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Get conversation lists (primary vs requests)
router.get('/conversations', auth, messageController.getConversations);

// Get message history with a specific user
router.get('/:userId', auth, messageController.getMessages);

// Approve a message request
router.post('/approve/:userId', auth, messageController.approveRequest);

// Decline a message request
router.post('/decline/:userId', auth, messageController.declineRequest);

module.exports = router;
