"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 15/07/2017.
 */
const redisService_1 = require("./redisService");
const bcrypt = require("bcrypt");
exports.Raspump = {
    async getStatus(deviceId) {
        sanitizeDeviceId(deviceId);
        const status = await redisService_1.redisService.hget('status:' + deviceId, 'value');
        return !!+status;
    },
    async getStatusAndDate(deviceId) {
        const [status, date] = await Promise.all([
            this.getStatus(deviceId),
            this.getLastModified(deviceId),
        ]);
        return { status, date };
    },
    async setStatus(deviceId, status) {
        sanitizeDeviceId(deviceId);
        status = !!+status;
        return await redisService_1.redisService.hmset('status:' + deviceId, ['value', String(+status), 'date', new Date().toISOString()]);
    },
    async getLastModified(deviceId) {
        sanitizeDeviceId(deviceId);
        const date = await redisService_1.redisService.hget('status:' + deviceId, 'date');
        return date && new Date(date) || null;
    },
    async setLastModified(deviceId, newDate) {
        sanitizeDeviceId(deviceId);
        return await redisService_1.redisService.hset('status:' + deviceId, 'date', newDate.toISOString());
    },
    async toggleStatus(deviceId) {
        sanitizeDeviceId(deviceId);
        const currentStatus = await this.getStatus(deviceId);
        const newStatus = !currentStatus;
        await this.setStatus(deviceId, newStatus);
        return newStatus;
    },
    async syncStatus(deviceId, status, modDate) {
        sanitizeDeviceId(deviceId);
        let newStatus;
        let newDate;
        let isModified = false;
        modDate = new Date(modDate);
        const [currentStatus, currentDate] = await Promise.all([
            this.getStatus(deviceId),
            this.getLastModified(deviceId),
        ]);
        if (modDate && (!currentDate || currentDate < modDate)) {
            // Server is outdated
            newStatus = status;
            newDate = modDate;
            // Update database. It is important to update the different records serially, because the status needs to be set BEFORE the
            // last modified date. Otherwise, the modified date will be overwritten.
            await this.setStatus(deviceId, newStatus);
            await this.setLastModified(deviceId, newDate);
        }
        else {
            // Client is outdated
            newStatus = currentStatus;
            newDate = currentDate;
            isModified = true;
        }
        return { status: newStatus, date: newDate, modified: isModified };
    },
    async auth(user, password) {
        const pass = await redisService_1.redisService.get(`auth:${user}`);
        if (!pass) {
            return false;
        }
        return pwCompare(password, pass);
    },
    async createUser(user, password) {
        // Check duplicate
        const dup = await redisService_1.redisService.get(`auth:${user}`);
        if (dup) {
            throw new Error('User already exists');
        }
        const hash = pwHash(password);
        const update = await redisService_1.redisService.set(`auth:${user}`, hash);
        return 'OK' === update;
    }
};
function sanitizeDeviceId(deviceId) {
    if (typeof deviceId !== 'string' || deviceId.length < 1) {
        throw new Error('Invalid device ID');
    }
}
function pwHash(pass) {
    return bcrypt.hashSync(pass, 4);
}
function pwCompare(pass, hash) {
    return bcrypt.compareSync(pass, hash);
}
//# sourceMappingURL=api.js.map