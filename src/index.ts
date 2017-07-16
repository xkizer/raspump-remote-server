/**
 * Created by kizer on 15/07/2017.
 */
const io = require('socket.io')(39000);

import {Raspump} from "./api";

const currentConnections = {};

io.on('connection', function(socket){
    currentConnections[socket.id] = { socket };

    socket.on('disconnect', () => {
        delete currentConnections[socket.id];
    });

    socket.on('auth', async ({user, password}, cb) => {
        const auth = await Raspump.auth(user, password);

        // Authentication failed, tell the user
        if (!auth) {
            return cb(false);
        }

        // Authentication passed, save auth info the socket, and tell user
        currentConnections[socket.id].auth = {user, loggedIn: new Date()};
        cb(true);

        // Set up other events for the client
        setupSocket(socket);
    });
});

function setupSocket(socket) {

    socket.on('getStatus', (deviceId, cb) => {
        Raspump.getStatus(deviceId).then(cb).catch(() => cb());
    });

    socket.on('setStatus', ({deviceId, status}, cb) => {
        Raspump.setStatus(deviceId, status).then(cb).catch(() => cb());
    });

    socket.on('getLastModified', (deviceId, cb) => {
        Raspump.getLastModified(deviceId).then(cb).catch(() => cb());
    });

    socket.on('setLastModified', ({deviceId, date}, cb) => {
        Raspump.setLastModified(deviceId, new Date(date)).then(cb).catch(() => cb());
    });

    socket.on('toggleStatus', (deviceId, cb) => {
        Raspump.toggleStatus(deviceId).then(cb).catch(() => cb());
    });

    socket.on('syncStatus', ({deviceId, status, date}, cb) => {
        Raspump.syncStatus(deviceId, status, date).then(cb).catch(() => cb());
    });

    socket.on('createUser', ({deviceId, status, date}, cb) => {
        Raspump.syncStatus(deviceId, status, date).then(cb).catch(() => cb());
    });

}
