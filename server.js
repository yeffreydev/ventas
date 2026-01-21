const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { wsManager } = require('./app/lib/websocket/manager.ts');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server,
    path: '/api/ws'
  });

  wss.on('connection', (ws, req) => {
    const clientId = Math.random().toString(36).substring(7);
    console.log(`New WebSocket connection: ${clientId}`);

    // Initialize client with default values
    let clientData = {
      id: clientId,
      socket: ws,
      accountId: 2, // Default account
      inboxIds: [],
      connectedAt: new Date(),
    };

    // Handle incoming messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'auth':
            // Update client with auth data
            clientData = {
              ...clientData,
              userId: data.userId,
              accountId: data.accountId || 2,
              inboxIds: data.inboxIds || [],
            };
            wsManager.addClient(clientData);
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'auth_success',
              clientId,
            }));
            console.log(`Client ${clientId} authenticated`);
            break;

          case 'subscribe_conversation':
            // Update active conversation
            wsManager.updateClient(clientId, {
              activeConversationId: data.conversationId,
            });
            console.log(`Client ${clientId} subscribed to conversation ${data.conversationId}`);
            break;

          case 'unsubscribe_conversation':
            // Clear active conversation
            wsManager.updateClient(clientId, {
              activeConversationId: undefined,
            });
            console.log(`Client ${clientId} unsubscribed from conversation`);
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            console.log(`Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`Client ${clientId} disconnected`);
      wsManager.removeClient(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      wsManager.removeClient(clientId);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to realtime server',
    }));
  });

  wss.on('error', (error) => {
    console.error('WebSocket Server error:', error);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws`);
  });
});