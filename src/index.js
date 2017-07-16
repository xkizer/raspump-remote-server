"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 15/07/2017.
 */
const io = require('socket.io')(39000);
const api_1 = require("./api");
const currentConnections = {};
io.on('connection', function (socket) {
    currentConnections[socket.id] = { socket };
    socket.on('disconnect', () => {
        delete currentConnections[socket.id];
    });
    socket.on('auth', async ({ user, password }, cb) => {
        const auth = await api_1.Raspump.auth(user, password);
        // Authentication failed, tell the user
        if (!auth) {
            return cb(false);
        }
        // Authentication passed, save auth info the socket, and tell user
        currentConnections[socket.id].auth = { user, loggedIn: new Date() };
        cb(true);
        // Set up other events for the client
        setupSocket(socket);
    });
});
function setupSocket(socket) {
    socket.on('getStatus', (deviceId, cb) => {
        api_1.Raspump.getStatus(deviceId).then(cb).catch(() => cb());
    });
    socket.on('setStatus', ({ deviceId, status }, cb) => {
        api_1.Raspump.setStatus(deviceId, status).then(cb).catch(() => cb());
    });
    socket.on('getLastModified', (deviceId, cb) => {
        api_1.Raspump.getLastModified(deviceId).then(cb).catch(() => cb());
    });
    socket.on('setLastModified', ({ deviceId, date }, cb) => {
        api_1.Raspump.setLastModified(deviceId, new Date(date)).then(cb).catch(() => cb());
    });
    socket.on('toggleStatus', (deviceId, cb) => {
        api_1.Raspump.toggleStatus(deviceId).then(cb).catch(() => cb());
    });
    socket.on('syncStatus', ({ deviceId, status, date }, cb) => {
        api_1.Raspump.syncStatus(deviceId, status, date).then(cb).catch(() => cb());
    });
    socket.on('createUser', ({ deviceId, status, date }, cb) => {
        api_1.Raspump.syncStatus(deviceId, status, date).then(cb).catch(() => cb());
    });
}
//# sourceMappingURL=index.js.map