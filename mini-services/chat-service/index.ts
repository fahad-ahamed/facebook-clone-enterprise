import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// User session tracking
interface UserSession {
  id: string
  userId: string
  username: string
  avatar?: string
  conversations: string[]
}

// Typing tracking per conversation
const typingUsers = new Map<string, Set<string>>() // conversationId -> Set of userIds

// User sessions
const userSessions = new Map<string, UserSession>()

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9)

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`)

  // ========== USER AUTHENTICATION ==========
  socket.on('auth', (data: { userId: string; username: string; avatar?: string; conversations: string[] }) => {
    const { userId, username, avatar, conversations } = data
    
    const session: UserSession = {
      id: socket.id,
      userId,
      username,
      avatar,
      conversations: conversations || []
    }
    
    userSessions.set(socket.id, session)
    
    // Join all conversation rooms
    conversations.forEach(convId => {
      socket.join(`conversation:${convId}`)
    })
    
    // Broadcast user online status
    socket.broadcast.emit('user-online', { userId, isOnline: true })
    
    console.log(`User authenticated: ${username} (${userId})`)
    
    socket.emit('auth-success', { 
      message: 'Authentication successful',
      sessionId: socket.id 
    })
  })

  // ========== JOIN CONVERSATION ==========
  socket.on('join-conversation', (data: { conversationId: string }) => {
    const { conversationId } = data
    socket.join(`conversation:${conversationId}`)
    
    // Update user session
    const session = userSessions.get(socket.id)
    if (session && !session.conversations.includes(conversationId)) {
      session.conversations.push(conversationId)
    }
    
    console.log(`User joined conversation: ${conversationId}`)
  })

  // ========== LEAVE CONVERSATION ==========
  socket.on('leave-conversation', (data: { conversationId: string }) => {
    const { conversationId } = data
    socket.leave(`conversation:${conversationId}`)
    
    // Update user session
    const session = userSessions.get(socket.id)
    if (session) {
      session.conversations = session.conversations.filter(id => id !== conversationId)
    }
    
    // Remove from typing
    const typing = typingUsers.get(conversationId)
    if (typing) {
      typing.delete(session?.userId || '')
      if (typing.size === 0) {
        typingUsers.delete(conversationId)
      }
    }
    
    console.log(`User left conversation: ${conversationId}`)
  })

  // ========== TYPING INDICATOR ==========
  socket.on('typing-start', (data: { conversationId: string; userId: string; userName: string }) => {
    const { conversationId, userId, userName } = data
    
    // Add to typing users
    if (!typingUsers.has(conversationId)) {
      typingUsers.set(conversationId, new Set())
    }
    typingUsers.get(conversationId)!.add(userId)
    
    // Broadcast to others in conversation
    socket.to(`conversation:${conversationId}`).emit('user-typing', {
      conversationId,
      userId,
      userName,
      isTyping: true
    })
  })

  socket.on('typing-stop', (data: { conversationId: string; userId: string }) => {
    const { conversationId, userId } = data
    
    // Remove from typing users
    const typing = typingUsers.get(conversationId)
    if (typing) {
      typing.delete(userId)
      if (typing.size === 0) {
        typingUsers.delete(conversationId)
      }
    }
    
    // Broadcast to others in conversation
    socket.to(`conversation:${conversationId}`).emit('user-typing', {
      conversationId,
      userId,
      isTyping: false
    })
  })

  // ========== NEW MESSAGE ==========
  socket.on('send-message', (data: { 
    conversationId: string
    messageId: string
    senderId: string
    senderName: string
    senderAvatar?: string
    content?: string
    messageType: string
    mediaUrl?: string
    fileName?: string
    fileSize?: number
    voiceDuration?: number
    createdAt: string
    isEncrypted: boolean
  }) => {
    const messageData = {
      ...data,
      status: 'sent',
      createdAt: data.createdAt || new Date().toISOString()
    }
    
    // Broadcast to conversation
    io.to(`conversation:${data.conversationId}`).emit('new-message', messageData)
    
    // Also send to specific user for delivery confirmation
    socket.emit('message-sent', { messageId: data.messageId, status: 'sent' })
    
    console.log(`Message sent in conversation ${data.conversationId}: ${data.messageId}`)
  })

  // ========== MESSAGE DELIVERED ==========
  socket.on('message-delivered', (data: { 
    conversationId: string
    messageId: string
    userId: string
  }) => {
    // Notify sender that message was delivered
    io.to(`conversation:${data.conversationId}`).emit('message-status', {
      conversationId: data.conversationId,
      messageId: data.messageId,
      status: 'delivered',
      deliveredAt: new Date().toISOString()
    })
    
    console.log(`Message delivered: ${data.messageId}`)
  })

  // ========== MESSAGE READ ==========
  socket.on('message-read', (data: { 
    conversationId: string
    messageId: string
    userId: string
  }) => {
    // Notify sender that message was read
    io.to(`conversation:${data.conversationId}`).emit('message-status', {
      conversationId: data.conversationId,
      messageId: data.messageId,
      status: 'read',
      readAt: new Date().toISOString(),
      readBy: data.userId
    })
    
    console.log(`Message read: ${data.messageId}`)
  })

  // ========== CONVERSATION READ ==========
  socket.on('conversation-read', (data: { 
    conversationId: string
    userId: string
    lastMessageId: string
  }) => {
    // Notify that all messages in conversation are read
    io.to(`conversation:${data.conversationId}`).emit('conversation-read', {
      conversationId: data.conversationId,
      userId: data.userId,
      lastMessageId: data.lastMessageId,
      readAt: new Date().toISOString()
    })
  })

  // ========== CALL SIGNALING ==========
  socket.on('call-initiate', (data: {
    callId: string
    conversationId: string
    callerId: string
    callerName: string
    callerAvatar?: string
    receiverId: string
    callType: 'audio' | 'video'
  }) => {
    // Broadcast to conversation that a call is starting
    socket.to(`conversation:${data.conversationId}`).emit('incoming-call', {
      ...data,
      status: 'calling',
      createdAt: new Date().toISOString()
    })
    
    console.log(`Call initiated: ${data.callId} by ${data.callerId}`)
  })

  socket.on('call-answer', (data: {
    callId: string
    conversationId: string
    answererId: string
    answererName: string
  }) => {
    // Notify caller that call was answered
    io.to(`conversation:${data.conversationId}`).emit('call-answered', {
      ...data,
      status: 'connected',
      startedAt: new Date().toISOString()
    })
    
    console.log(`Call answered: ${data.callId}`)
  })

  socket.on('call-decline', (data: {
    callId: string
    conversationId: string
    declinerId: string
  }) => {
    // Notify caller that call was declined
    io.to(`conversation:${data.conversationId}`).emit('call-declined', {
      ...data,
      status: 'declined',
      endedAt: new Date().toISOString()
    })
    
    console.log(`Call declined: ${data.callId}`)
  })

  socket.on('call-end', (data: {
    callId: string
    conversationId: string
    endedBy: string
    duration: number
  }) => {
    // Notify all participants that call ended
    io.to(`conversation:${data.conversationId}`).emit('call-ended', {
      ...data,
      status: 'ended',
      endedAt: new Date().toISOString()
    })
    
    console.log(`Call ended: ${data.callId}, duration: ${data.duration}s`)
  })

  // ========== WEBRTC SIGNALING ==========
  socket.on('webrtc-offer', (data: {
    conversationId: string
    callerId: string
    receiverId: string
    offer: any
  }) => {
    socket.to(`conversation:${data.conversationId}`).emit('webrtc-offer', data)
  })

  socket.on('webrtc-answer', (data: {
    conversationId: string
    answererId: string
    callerId: string
    answer: any
  }) => {
    socket.to(`conversation:${data.conversationId}`).emit('webrtc-answer', data)
  })

  socket.on('webrtc-ice-candidate', (data: {
    conversationId: string
    senderId: string
    receiverId: string
    candidate: any
  }) => {
    socket.to(`conversation:${data.conversationId}`).emit('webrtc-ice-candidate', data)
  })

  // ========== REACTIONS ==========
  socket.on('message-reaction', (data: {
    conversationId: string
    messageId: string
    userId: string
    userName: string
    reaction: string
  }) => {
    io.to(`conversation:${data.conversationId}`).emit('message-reaction', data)
  })

  // ========== DISCONNECT ==========
  socket.on('disconnect', () => {
    const session = userSessions.get(socket.id)
    
    if (session) {
      // Broadcast user offline status
      socket.broadcast.emit('user-offline', { 
        userId: session.userId, 
        isOnline: false,
        lastActive: new Date().toISOString()
      })
      
      // Clean up typing indicators
      session.conversations.forEach(convId => {
        const typing = typingUsers.get(convId)
        if (typing) {
          typing.delete(session.userId)
          if (typing.size === 0) {
            typingUsers.delete(convId)
          }
        }
      })
      
      userSessions.delete(socket.id)
      console.log(`User disconnected: ${session.username} (${session.userId})`)
    } else {
      console.log(`User disconnected: ${socket.id}`)
    }
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Chat WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    console.log('Chat WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    console.log('Chat WebSocket server closed')
    process.exit(0)
  })
})
