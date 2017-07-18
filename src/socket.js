"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 18/07/2017.
 */
/**
 * Created by kizer on 15/07/2017.
 */
const pubsub_1 = require("./pubsub");
const api_1 = require("./api");
let io = require('socket.io');
const currentConnections = {};
function startSocket(port) {
    io = io(port);
    io.on('connection', function (socket) {
        currentConnections[socket.id] = { socket };
        socket.on('disconnect', () => {
            // Remove the saved connection
            const subs = currentConnections[socket.id].subs;
            delete currentConnections[socket.id];
            // Unsubscribe from all devices
            if (subs && subs.length > 0) {
                subs.forEach(sub => {
                    sub.unsub();
                });
            }
        });
        socket.on('auth', async ({ user, password }, cb) => {
            const auth = await api_1.Raspump.auth(user, password);
            // Authentication failed, tell the user
            if (!auth) {
                return cb(false);
            }
            // Authentication passed, save auth info to the socket, and tell user
            currentConnections[socket.id].auth = { user, loggedIn: new Date() };
            cb(true);
            // Set up other events for the client
            setupSocket(socket);
        });
    });
}
exports.startSocket = startSocket;
function setupSocket(socket) {
    socket.on('getStatus', (deviceId, cb) => {
        api_1.Raspump.getStatus(deviceId).then(cb).catch(() => cb());
    });
    socket.on('setStatus', ({ deviceId, status }, cb) => {
        api_1.Raspump.setStatus(deviceId, status)
            .then(() => pubsub_1.pubsub.publish(deviceId, 'status'))
            .then(cb)
            .catch(() => cb(false));
    });
    socket.on('getLastModified', (deviceId, cb) => {
        api_1.Raspump.getLastModified(deviceId).then(cb).catch(() => cb());
    });
    socket.on('setLastModified', ({ deviceId, date }, cb) => {
        api_1.Raspump.setLastModified(deviceId, new Date(date))
            .then(() => pubsub_1.pubsub.publish(deviceId, 'status'))
            .then(cb).catch(() => cb());
    });
    socket.on('toggleStatus', (deviceId, cb) => {
        api_1.Raspump.toggleStatus(deviceId)
            .then(() => pubsub_1.pubsub.publish(deviceId, 'status'))
            .then(cb).catch(() => cb());
    });
    socket.on('syncStatus', ({ deviceId, status, date }, cb) => {
        api_1.Raspump.syncStatus(deviceId, status, date).then(cb).catch(() => cb());
    });
    socket.on('createUser', ({ deviceId, status, date }, cb) => {
        api_1.Raspump.syncStatus(deviceId, status, date).then(cb).catch(() => cb());
    });
    socket.on('subscribe', deviceId => {
        // This user wants to be notified when something changes about this device
        const subs = currentConnections[socket.id].subs || (currentConnections[socket.id].subs = []);
        const cb = async () => {
            const [status, date] = await Promise.all([
                api_1.Raspump.getStatus(deviceId),
                api_1.Raspump.getLastModified(deviceId),
            ]);
            socket.emit('status', { deviceId, status, date });
        };
        subs.push({ deviceId, cb, unsub: pubsub_1.pubsub.subscribe(deviceId, cb) });
    });
    socket.on('unsubscribe', deviceId => {
        const subs = currentConnections[socket.id].subs || (currentConnections[socket.id].subs = []);
        currentConnections[socket.id].subs = subs.filter(sub => {
            if (deviceId === sub.deviceId) {
                const unsub = sub.unsub;
                unsub();
                return false;
            }
            return true;
        });
    });
}
exports.Raspump = api_1.Raspump;
exports.pubsub = pubsub_1.pubsub;
//# sourceMappingURL=socket.js.map