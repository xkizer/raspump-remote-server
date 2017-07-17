/**
 * Created by kizer on 15/07/2017.
 */
import {redisService} from "./redisService";
import * as bcrypt from 'bcrypt';

export const Raspump = {

    async getStatus(deviceId: string): Promise<boolean> {
        sanitizeDeviceId(deviceId);
        const status = await redisService.hget('status:' + deviceId, 'value');
        return !!+status;
    },

    async getStatusAndDate(deviceId: string): Promise<{status: boolean, date: Date}> {
        const [status, date] = await Promise.all([
            this.getStatus(deviceId),
            this.getLastModified(deviceId),
        ]);

        return { status, date };
    },

    async setStatus(deviceId: string, status: boolean): Promise<boolean> {
        sanitizeDeviceId(deviceId);
        status = !!+status;
        return await redisService.hmset('status:' + deviceId, ['value', String(+status), 'date', new Date().toISOString()]);
    },

    async getLastModified(deviceId: string): Promise<Date> {
        sanitizeDeviceId(deviceId);
        const date = await redisService.hget('status:' + deviceId, 'date');
        return date && new Date(date) || null;
    },

    async setLastModified(deviceId, newDate: Date): Promise<boolean> {
        sanitizeDeviceId(deviceId);
        return await redisService.hset('status:' + deviceId, 'date', newDate.toISOString());
    },

    async toggleStatus(deviceId: string): Promise<boolean> {
        sanitizeDeviceId(deviceId);
        const currentStatus = await this.getStatus(deviceId);
        const newStatus = !currentStatus;
        await this.setStatus(deviceId, newStatus);
        return newStatus;
    },

    async syncStatus(deviceId: string, status: boolean, modDate: Date): Promise<SyncStatusOpResult> {
        sanitizeDeviceId(deviceId);
        let newStatus: boolean;
        let newDate: Date;
        let isModified = false;

        const [currentStatus, currentDate] = await Promise.all([
            this.getStatus(deviceId),
            this.getLastModified(deviceId),
        ]);

        if (!currentDate || currentDate < modDate) {
            // Server is outdated
            newStatus = status;
            newDate = modDate;

            // Update database. It is important to update the different records serially, because the status needs to be set BEFORE the
            // last modified date. Otherwise, the modified date will be overwritten.
            await this.setStatus(deviceId, newStatus);
            await this.setLastModified(deviceId, newDate);
        } else {
            // Client is outdated
            newStatus = currentStatus;
            newDate = currentDate;
            isModified = true;
        }

        return {status: newStatus, date: newDate, modified: isModified};
    },

    async auth(user: string, password: string): Promise<boolean> {
        const pass = await redisService.get(`auth:${user}`);

        if (!pass) {
            return false;
        }

        return pwCompare(password, pass);
    },

    async createUser(user: string, password: string): Promise<boolean> {
        // Check duplicate
        const dup = await redisService.get(`auth:${user}`);

        if (dup) {
            throw new Error('User already exists');
        }

        const hash = pwHash(password);
        const update = await redisService.set(`auth:${user}`, hash);
        return 'OK' === update as any;
    }

};

function sanitizeDeviceId(deviceId) {
    if (typeof deviceId !== 'string' || deviceId.length < 1) {
        throw new Error('Invalid device ID');
    }
}

function pwHash(pass: string): string {
    return bcrypt.hashSync(pass, 4);
}

function pwCompare(pass, hash): boolean {
    return bcrypt.compareSync(pass, hash);
}

declare type SyncStatusOpResult = {
    status: boolean,
    date: Date,
    modified: boolean,
};
