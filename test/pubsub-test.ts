/**
 * Created by kizer on 17/07/2017.
 */
import * as chai from 'chai';
import * as asPromised from 'chai-as-promised';
import * as spies from 'chai-spies';
import { expect } from 'chai';
import {pubsub} from  "../src/pubsub";

const deviceId = 'test-device';
chai.use(asPromised);
chai.use(spies);

const cb = chai.spy();

describe('pubsub', () => {
    describe('publish', () => {
        it('should publish without issues', () => {
            return expect(pubsub.publish(deviceId, 'message')).to.eventually.be.a('number');
        });
    });

    describe('subscribe', () => {
        it('should subscribe and return an unsubscribe function', () => {
            const unsub = pubsub.subscribe(deviceId, () => {});
            expect(unsub).to.be.a('function');
            unsub();

        });

        it('should get messages from the server', () => {
            const unsub = pubsub.subscribe(deviceId, cb);
            pubsub.publish(deviceId, 'cryptic message');
            return new Promise(res => setTimeout(res, 100))
                .then(unsub)
                .then(() => expect(cb).to.have.been.called.with('cryptic message'));
        });

        it('should reconstruct the message before dispatching events', () => {
            const unsub = pubsub.subscribe(deviceId, cb);
            pubsub.publish(deviceId, {name: 'Kizer', root: true});
            return new Promise(res => setTimeout(res, 100))
                .then(unsub)
                .then(() => expect(cb).to.have.been.called.with({name: 'Kizer', root: true}));
        });

        it('should support multiple listeners', () => {
            const cb2 = chai.spy();
            const unsub = pubsub.subscribe(deviceId, cb);
            const unsub2 = pubsub.subscribe(deviceId, cb2);
            pubsub.publish(deviceId, 'multi message');

            return new Promise(res => setTimeout(res, 100))
                .then(unsub)
                .then(unsub2)
                .then(() => Promise.all([
                    expect(cb).to.have.been.called.with('multi message'),
                    expect(cb2).to.have.been.called.with('multi message'),
                ]));
        });

        it('should only send message for subscribed channel', () => {
            const cb2 = chai.spy();
            const unsub = pubsub.subscribe(deviceId, cb);
            const unsub2 = pubsub.subscribe('some-other-device', cb2);
            pubsub.publish(deviceId, 'message 3');

            return new Promise(res => setTimeout(res, 100))
                .then(unsub)
                .then(unsub2)
                .then(() => Promise.all([
                    expect(cb).to.have.been.called.with('message 3'),
                    expect(cb2).to.not.have.been.called(),
                ]));
        });

        it('should unsubscribe', () => {
            const cb2 = chai.spy();
            const unsub = pubsub.subscribe(deviceId, cb);
            const unsub2 = pubsub.subscribe(deviceId, cb2);
            pubsub.publish(deviceId, 'message 4')
                .then(unsub)
                .then(() => pubsub.publish(deviceId, 'message 5'));

            return new Promise(res => setTimeout(res, 100))
                .then(unsub2)
                .then(() => Promise.all([
                    expect(cb).to.have.been.called.with('message 4'),
                    expect(cb2).to.have.been.called.with('message 4'),
                    expect(cb2).to.have.been.called.with('message 5'),
                    expect(cb).to.not.have.been.called.with('message 5'),
                ]));
        });
    });
});
