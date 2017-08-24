"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 18/07/2017.
 */
const pubsub_1 = require("./pubsub");
const api_1 = require("./api");
let io = require('socket.io');
const currentConnections = {};
const noop = (..._) => { };
function startSocket(port) {
    io = io(port);
    io.on('connection', function (socket) {
        currentConnections[socket.id] = { socket, subs: [] };
        console.log('CONNECTED', socket.id);
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
            console.log('DISCONNECTED', socket.id);
        });
        socket.on('auth', async ({ user, password }, cb = noop) => {
            const auth = await api_1.Raspump.auth(user, password);
            console.log('AUTHENTICATION RESULT', user, password, auth, socket.id);
            // Authentication failed, tell the user
            if (!auth) {
                return cb(false);
            }
            const alreadySetup = !!currentConnections[socket.id].auth;
            // Authentication passed, save auth info to the socket, and tell user
            currentConnections[socket.id].auth = { user, loggedIn: new Date() };
            cb(true);
            // Set up other events for the client, but only if this is the first time this client is authenticating
            if (!alreadySetup) {
                setupSocket(socket);
            }
        });
    });
}
exports.startSocket = startSocket;
function setupSocket(socket) {
    socket.on('getStatus', (deviceId, cb = noop) => {
        api_1.Raspump.getStatus(deviceId).then(cb).catch(() => cb());
    });
    socket.on('setStatus', ({ deviceId, status }, cb = noop) => {
        api_1.Raspump.setStatus(deviceId, status)
            .then(args => pubsub_1.pubsub.publish(deviceId, 'status').then(() => args))
            .then(cb)
            .catch(() => cb());
    });
    socket.on('getLastModified', (deviceId, cb = noop) => {
        api_1.Raspump.getLastModified(deviceId).then(cb).catch(() => cb());
    });
    socket.on('getStatusAndDate', (deviceId, cb = noop) => {
        api_1.Raspump.getStatusAndDate(deviceId).then(cb).catch(() => cb());
    });
    socket.on('setLastModified', ({ deviceId, date }, cb = noop) => {
        api_1.Raspump.setLastModified(deviceId, new Date(date))
            .then(args => pubsub_1.pubsub.publish(deviceId, 'status').then(() => args))
            .then(cb).catch(() => cb());
    });
    socket.on('toggleStatus', (deviceId, cb = noop) => {
        api_1.Raspump.toggleStatus(deviceId)
            .then(args => pubsub_1.pubsub.publish(deviceId, 'status').then(() => args))
            .then(cb).catch(() => cb());
    });
    socket.on('syncStatus', ({ deviceId, status, date }, cb = noop) => {
        console.log('SYNC STATUS', deviceId);
        api_1.Raspump.syncStatus(deviceId, status, date)
            .then(args => {
            if (!args.modified) {
                // Client not modified, server stale
                return pubsub_1.pubsub.publish(deviceId, 'status').then(() => args);
            }
            return args;
        })
            .then(cb).catch(() => cb());
    });
    socket.on('createUser', ({ user, password }, cb = noop) => {
        api_1.Raspump.createUser(user, password)
            .then(args => pubsub_1.pubsub.publish('system', { event: 'createUser', user, password }).then(() => args))
            .then(cb).catch(() => cb());
    });
    socket.on('subscribe', (deviceId, ack = noop) => {
        console.log('SUBSCRIPTION REQUEST', deviceId, socket.id);
        // This user wants to be notified when something changes about this device
        const subs = currentConnections[socket.id] && currentConnections[socket.id].subs || (currentConnections[socket.id].subs = []);
        let cb;
        if (deviceId === 'system') {
            // System events, treat special
            cb = async (msg) => {
                socket.emit('system', msg);
            };
        }
        else if (!deviceId) {
            return ack(false);
        }
        else {
            cb = async () => {
                const [status, date] = await Promise.all([
                    api_1.Raspump.getStatus(deviceId),
                    api_1.Raspump.getLastModified(deviceId),
                ]);
                socket.emit('status', { deviceId, status, date: date.toISOString() });
            };
        }
        subs.push({ deviceId, cb, unsub: pubsub_1.pubsub.subscribe(deviceId, cb) });
        // Publish a system event
        pubsub_1.pubsub.publish('system', { event: 'subscribe', socketId: socket.id, deviceId });
        ack(true);
    });
    socket.on('unsubscribe', (deviceId, ack) => {
        const subs = currentConnections[socket.id] && currentConnections[socket.id].subs || (currentConnections[socket.id].subs = []);
        currentConnections[socket.id].subs = subs.filter(sub => {
            if (deviceId === sub.deviceId) {
                const unsub = sub.unsub;
                unsub();
                return false;
            }
            return true;
        });
        // Publish a system event
        pubsub_1.pubsub.publish('system', { event: 'unsubscribe', socketId: socket.id, deviceId });
        ack(true);
    });
}
exports.Raspump = api_1.Raspump;
exports.pubsub = pubsub_1.pubsub;
//# sourceMappingURL=socket.js.map