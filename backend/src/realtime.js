const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { setIO } = require('./services/notifications');

function initSocket(httpServer) {
    const io = new Server(httpServer, { cors: { origin: '*' } });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Missing authentication token'));
        try {
            socket.user = jwt.verify(token, process.env.JWT_SECRET);
            next();
        } catch (err) {
            next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        socket.join(`user:${socket.user.id}`);
        if (socket.user.role === 'admin') {
            socket.join('admins');
        }
    });

    setIO(io);
    return io;
}

module.exports = { initSocket };
