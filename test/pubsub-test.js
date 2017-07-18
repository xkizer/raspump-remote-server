"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by kizer on 17/07/2017.
 */
const chai = require("chai");
const asPromised = require("chai-as-promised");
const spies = require("chai-spies");
const chai_1 = require("chai");
const pubsub_1 = require("../src/pubsub");
const deviceId = 'test-device';
chai.use(asPromised);
chai.use(spies);
const cb = chai.spy();
describe('pubsub', () => {
    describe('publish', () => {
        it('should publish without issues', () => {
            return chai_1.expect(pubsub_1.pubsub.publish(deviceId, 'message')).to.eventually.be.a('number');
        });
    });
    describe('subscribe', () => {
        it('should subscribe and return an unsubscribe function', () => {
            const unsub = pubsub_1.pubsub.subscribe(deviceId, () => { });
            chai_1.expect(unsub).to.be.a('function');
            unsub();
        });
        it('should get messages from the server', () => {
            const unsub = pubsub_1.pubsub.subscribe(deviceId, cb);
            pubsub_1.pubsub.publish(deviceId, 'cryptic message');
            return new Promise(res => setTimeout(res, 100))
                .then(unsub)
                .then(() => chai_1.expect(cb).to.have.been.called.with('cryptic message'));
        });
        it('should reconstruct the message before dispatching events', () => {
            const unsub = pubsub_1.pubsub.subscribe(deviceId, cb);
            pubsub_1.pubsub.publish(deviceId, { name: 'Kizer', root: true });
            return new Promise(res => setTimeout(res, 100))
                .then(unsub)
                .then(() => chai_1.expect(cb).to.have.been.called.with({ name: 'Kizer', root: true }));
        });
        it('should support multiple listeners', () => {
            const cb2 = chai.spy();
            const unsub = pubsub_1.pubsub.subscribe(deviceId, cb);
            const unsub2 = pubsub_1.pubsub.subscribe(deviceId, cb2);
            pubsub_1.pubsub.publish(deviceId, 'multi message');
            return new Promise(res => setTimeout(res, 100))
                .then(unsub)
                .then(unsub2)
                .then(() => Promise.all([
                chai_1.expect(cb).to.have.been.called.with('multi message'),
                chai_1.expect(cb2).to.have.been.called.with('multi message'),
            ]));
        });
        it('should only send message for subscribed channel', () => {
            const cb2 = chai.spy();
            const unsub = pubsub_1.pubsub.subscribe(deviceId, cb);
            const unsub2 = pubsub_1.pubsub.subscribe('some-other-device', cb2);
            pubsub_1.pubsub.publish(deviceId, 'message 3');
            return new Promise(res => setTimeout(res, 100))
                .then(unsub)
                .then(unsub2)
                .then(() => Promise.all([
                chai_1.expect(cb).to.have.been.called.with('message 3'),
                chai_1.expect(cb2).to.not.have.been.called(),
            ]));
        });
        it('should unsubscribe', () => {
            const cb2 = chai.spy();
            const unsub = pubsub_1.pubsub.subscribe(deviceId, cb);
            const unsub2 = pubsub_1.pubsub.subscribe(deviceId, cb2);
            pubsub_1.pubsub.publish(deviceId, 'message 4')
                .then(unsub)
                .then(() => pubsub_1.pubsub.publish(deviceId, 'message 5'));
            return new Promise(res => setTimeout(res, 100))
                .then(unsub2)
                .then(() => Promise.all([
                chai_1.expect(cb).to.have.been.called.with('message 4'),
                chai_1.expect(cb2).to.have.been.called.with('message 4'),
                chai_1.expect(cb2).to.have.been.called.with('message 5'),
                chai_1.expect(cb).to.not.have.been.called.with('message 5'),
            ]));
        });
    });
});
//# sourceMappingURL=pubsub-test.js.map