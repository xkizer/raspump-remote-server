/**
 * Created by kizer on 15/07/2017.
 */
import {createClient, RedisClient} from 'redis';
import {promisify} from "util";

const client = createClient();
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

export const redisService: redisClient = {} as any;

toProm.forEach(comm => {
    redisService[comm] = promisify(client[comm]).bind(client);
});

declare type redisClient = {} & RedisClient;
