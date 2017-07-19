"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 16/07/2017.
 */
const redisService_1 = require("../src/redisService");
const api_1 = require("../src/api");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const expect = chai.expect;
const deviceId = 'test-device';
chai.use(chaiAsPromised);
describe('Raspump', () => {
    beforeEach(() => redisService_1.redisService.del('status:' + deviceId));
    describe('.getStatus/.setStatus', () => {
        it('should set and return the status', async () => {
            // Create sample
            await api_1.Raspump.setStatus(deviceId, true);
            return Promise.all([
                expect(api_1.Raspump.getStatus(deviceId)).to.eventually.equal(true),
                api_1.Raspump.setStatus(deviceId, false).then(() => expect(api_1.Raspump.getStatus(deviceId)).to.eventually.equal(false)),
            ]);
        });
    });
    describe('.getLastModified/.setLastModified', () => {
        it('should set and return last modified date', async () => {
            const date = new Date();
            await api_1.Raspump.setLastModified(deviceId, date);
            await new Promise(res => setTimeout(res, 100));
            return expect(api_1.Raspump.getLastModified(deviceId)).to.become(date);
        });
    });
    describe('.getStatusAndDate', () => {
        it('should set and return last modified date with status', async () => {
            const date = new Date();
            await Promise.all([
                api_1.Raspump.setStatus(deviceId, true),
                api_1.Raspump.setLastModified(deviceId, date),
            ]);
            await new Promise(res => setTimeout(res, 100));
            return expect(api_1.Raspump.getStatusAndDate(deviceId)).to.become({ status: true, date });
        });
    });
    describe('.setStatus', () => {
        it('should also set the last modified', async () => {
            await api_1.Raspump.setStatus(deviceId, true);
            const firstDate = await api_1.Raspump.getLastModified(deviceId);
            await new Promise(res => setTimeout(res, 100));
            await api_1.Raspump.setStatus(deviceId, true);
            const secondDate = await api_1.Raspump.getLastModified(deviceId);
            return Promise.all([
                expect(firstDate).to.be.instanceof(Date),
                expect(firstDate).to.not.deep.equal(secondDate),
            ]);
        });
    });
    describe('.toggleStatus', () => {
        it('should invert the current status', async () => {
            await api_1.Raspump.setStatus(deviceId, true);
            const status1 = await api_1.Raspump.getStatus(deviceId);
            await api_1.Raspump.toggleStatus(deviceId);
            const status2 = await api_1.Raspump.getStatus(deviceId);
            await api_1.Raspump.toggleStatus(deviceId);
            const status3 = await api_1.Raspump.getStatus(deviceId);
            return Promise.all([
                expect(status1).to.be.equal(true),
                expect(status2).to.be.equal(false),
                expect(status3).to.be.equal(true),
            ]);
        });
    });
    describe('.syncStatus', () => {
        it('should update the status if record does not exist', async () => {
            const date = new Date();
            await redisService_1.redisService.del(deviceId);
            const data = await api_1.Raspump.syncStatus(deviceId, true, date);
            return Promise.all([
                expect(data).to.deep.equal({ status: true, date, modified: false }),
                expect(api_1.Raspump.getStatus(deviceId)).to.become(true),
                expect(api_1.Raspump.getLastModified(deviceId)).to.become(date),
            ]);
        });
        it('should update the status if server is out of date', async () => {
            const date = new Date();
            await new Promise(res => setTimeout(res, 100)); // Delay a bit to allow reasonable time difference
            const data = await api_1.Raspump.syncStatus(deviceId, false, date);
            return Promise.all([
                expect(data).to.deep.equal({ status: false, date, modified: false }),
                expect(api_1.Raspump.getStatus(deviceId)).to.become(false),
                expect(api_1.Raspump.getLastModified(deviceId)).to.become(date),
            ]);
        });
        it('should compare all dates properly', async () => {
            const date = new Date('2017-07-19T00:55:20.188Z');
            const date2 = new Date('2017-07-19T01:55:20.188Z');
            api_1.Raspump.setLastModified(deviceId, date);
            await new Promise(res => setTimeout(res, 100)); // Delay a bit to allow reasonable time difference
            const data = await api_1.Raspump.syncStatus(deviceId, false, date2.toISOString());
            return Promise.all([
                expect(data).to.deep.equal({ status: false, date: date2, modified: false }),
                expect(api_1.Raspump.getStatus(deviceId)).to.become(false),
                expect(api_1.Raspump.getLastModified(deviceId)).to.become(date2),
            ]);
        });
        it('should keep current value if the requester is stale', async () => {
            const date = new Date();
            await new Promise(res => setTimeout(res, 100)); // Delay a bit to allow reasonable time difference
            await api_1.Raspump.setStatus(deviceId, false);
            const { status, modified } = await api_1.Raspump.syncStatus(deviceId, true, date);
            return Promise.all([
                expect({ status, modified }).to.deep.equal({ status: false, modified: true }),
                expect(api_1.Raspump.getStatus(deviceId)).to.become(false),
                expect(api_1.Raspump.getLastModified(deviceId)).to.not.become(date),
            ]);
        });
    });
    describe('.createUser/.auth', () => {
        beforeEach(() => redisService_1.redisService.del('auth:user'));
        it('should create a user', () => {
            return expect(api_1.Raspump.createUser('user', 'password')).to.eventually.equal(true);
        });
        it('should not create duplicates', async () => {
            await api_1.Raspump.createUser('user', 'password');
            return expect(api_1.Raspump.createUser('user', 'password2')).to.be.rejected;
        });
        it('should authenticate properly', async () => {
            await api_1.Raspump.createUser('user', 'password');
            return Promise.all([
                expect(api_1.Raspump.auth('user', 'password'), 'correct info').to.eventually.equal(true),
                expect(api_1.Raspump.auth('user2', 'password'), 'incorrect user').to.eventually.equal(false),
                expect(api_1.Raspump.auth('user', 'password2'), 'incorrect pw').to.eventually.equal(false),
                expect(api_1.Raspump.auth('user2', 'password2'), 'incorrect both').to.eventually.equal(false),
            ]);
        });
    });
});
//# sourceMappingURL=api-test.js.map