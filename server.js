const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const Actions = require('./Actions');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

app.get('/', (req, res) => {
    res.send('Hello Swapnil');
});

const userSocketMap = {};

function getAllConnectedClients(roomId) {
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    return clients.map((socketId) => ({
        socketId,
        username: userSocketMap[socketId],
    }));
}

io.on('connection', (socket) => {
    console.log('Socket connected', socket.id);

    socket.on(Actions.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(Actions.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });

        console.log(`${username} joined room: ${roomId}`);
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.to(roomId).emit(Actions.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        
        delete userSocketMap[socket.id];
    });

    socket.on(Actions.CODE_CHANGE, ({ roomId, code }) => {
        console.log(roomId, " : ", code);
        socket.in(roomId).emit(Actions.CODE_CHANGE, { code });
    });

    socket.on(Actions.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(Actions.CODE_CHANGE, { code });
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected', socket.id);
    });
});

const PORT = 3000;

server.listen(PORT, () => console.log(`Server is started on port ${PORT}`));
