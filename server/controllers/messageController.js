const Message = require('../models/Message');
const User = require('../models/User');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all messages where the user is either sender or receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ createdAt: -1 });

    const primaryUsers = new Map(); // targetUserId -> { user, lastMessage, unreadCount }
    const requestUsers = new Map(); // targetUserId -> { user, lastMessage, unreadCount }

    // First collect all target user IDs to fetch their details efficiently
    const targetUserIds = new Set();
    messages.forEach(msg => {
      const targetId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
      targetUserIds.add(targetId);
    });

    const populatedUsers = await User.find({ _id: { $in: Array.from(targetUserIds) } })
      .select('username fullName avatar');
    
    const userLookup = {};
    populatedUsers.forEach(u => userLookup[u._id.toString()] = u);

    // Grouping
    messages.forEach(msg => {
      const isSender = msg.sender.toString() === userId;
      const targetId = isSender ? msg.receiver.toString() : msg.sender.toString();
      const targetUser = userLookup[targetId];

      if (!targetUser) return;

      // Unread logic
      const isUnread = !isSender && !msg.isRead;

      // Request logic
      // If the message is a request and we did NOT send it, it goes to Request tab
      const isRequest = msg.isRequest && !isSender;

      const mapToUse = isRequest ? requestUsers : primaryUsers;

      if (!mapToUse.has(targetId)) {
        mapToUse.set(targetId, {
          user: targetUser,
          lastMessage: { content: msg.content, createdAt: msg.createdAt, sender: msg.sender },
          unreadCount: isUnread ? 1 : 0
        });
      } else {
        if (isUnread) {
          const current = mapToUse.get(targetId);
          current.unreadCount += 1;
          mapToUse.set(targetId, current);
        }
      }
    });

    res.json({
      primary: Array.from(primaryUsers.values()),
      requests: Array.from(requestUsers.values())
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Server error fetching conversations' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: targetId },
        { sender: targetId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    // Mark as read when fetching
    await Message.updateMany(
      { sender: targetId, receiver: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetId = req.params.userId;

    // Approve all current and future messages between these two
    await Message.updateMany(
      {
        $or: [
          { sender: targetId, receiver: userId },
          { sender: userId, receiver: targetId }
        ]
      },
      { $set: { isRequest: false } }
    );

    res.json({ message: "Request approved successfully" });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Server error approving request' });
  }
};

exports.declineRequest = async (req, res) => {
    try {
      const userId = req.user.id;
      const targetId = req.params.userId;
  
      // Delete the messages forming the request
      await Message.deleteMany({
        $or: [
          { sender: targetId, receiver: userId, isRequest: true },
          { sender: userId, receiver: targetId, isRequest: true }
        ]
      });
  
      res.json({ message: "Request declined and deleted successfully" });
    } catch (error) {
      console.error('Error declining request:', error);
      res.status(500).json({ error: 'Server error declining request' });
    }
  };
