"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 15/07/2017.
 */
const redis_1 = require("redis");
const util_1 = require("util");
const client = redis_1.createClient();
// client.select(3, () => {
//     console.log('REDIS SETUP ON DATABASE 3');
// });
// Promisify
const toProm = [
    'get',
    'set',
    'hget',
    'hset',
    'hgetall',
    'hexists',
    'hdel',
    'getset',
    'incr',
    'incrby',
    'hmset',
    'del',
];
exports.redisService = {};
toProm.forEach(comm => {
    exports.redisService[comm] = util_1.promisify(client[comm]).bind(client);
});
//# sourceMappingURL=redisService.js.map