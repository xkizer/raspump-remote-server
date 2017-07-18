"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 17/07/2017.
 */
const util_1 = require("util");
const redis = require("redis");
const sub = redis.createClient(), pub = redis.createClient();
const subscribers = {};
pub.publish = util_1.promisify(pub.publish);
exports.pubsub = {
    subscribe(channel, cb) {
        sub.subscribe(channel);
        const chann = subscribers[channel] || (subscribers[channel] = []);
        chann.push(cb);
        return () => {
            const chann = subscribers[channel] || (subscribers[channel] = []);
            subscribers[channel] = chann.filter(sub => sub !== cb);
            if (subscribers[channel].length === 0) {
                // No more subscribers, unsubscribe from redis
                sub.unsubscribe(channel);
            }
        };
    },
    async publish(channel, msg) {
        return await pub.publish(channel, JSON.stringify(msg));
    },
};
// When we receive a message...
sub.on("message", function (channel, message) {
    // Forward the message to every subscriber
    const subs = subscribers[channel] || [];
    let unmsg;
    try {
        unmsg = JSON.parse(message);
    }
    catch (e) {
        unmsg = message;
    }
    console.log('MESSAGE', channel, message);
    subs.forEach(cb => cb(message));
});
//# sourceMappingURL=pubsub.js.map