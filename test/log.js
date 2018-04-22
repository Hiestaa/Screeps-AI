const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
chai.use(require('sinon-chai'));

global.Memory = {};

const log = require('../src/log');

describe('log', function() {
    beforeEach(function() {
        sinon.stub(console, 'log');
    });

    afterEach(function() {
        console.log.restore();
    });

    describe('getLogger', function() {
        it('should build a logger able to log with the appropriate color', function() {
            const logger = log.getLogger('my.scope', 'green');
            expect(logger.filename).to.be.equal('my.scope');
            expect(logger.color).to.be.equal('green');
            logger.info('foo bar');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: green" ' +
                'color="green" severity="2">[INFO][MY.SCOPE] foo bar</font>');
        });

        it('should reuse existing logger', function() {
            log.getLogger('my.scope', 'green')._foo = 'bar';
            expect(log.getLogger('my.scope')._foo).to.equal('bar');
        });

        it('should support all log levels', function() {
            const logger = log.getLogger('my.scope', 'green');
            const levels = 'debug info warning error fatal'.split(' ');
            levels.forEach(lvl => {
                logger[lvl]('Test ' + lvl);
            });
            // debug is disabled by default
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: green" color="green"' +
                ' severity="2">[INFO][MY.SCOPE] Test info</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 16px; style: italic; color: green" color="green"' +
                ' severity="3">[WARNING][MY.SCOPE] Test warning</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 18px; font-weight: bold; color: green"' +
                ' color="green" severity="4">[ERROR][MY.SCOPE] Test error</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 20px; font-weight: bold; style: italic; color: green"' +
                ' color="green" severity="5">[FATAL][MY.SCOPE] Test fatal</font>');
        });
    });

    describe('enableLogger', function() {
        it('should be able to enable a single logger', function() {
            // disabled by default (no color specified)
            const logger = log.getLogger('test.log.enableLogger');
            logger.info('foo bar');
            expect(console.log).to.not.have.been.called;
            log.enableLogger('test.log.enableLogger', 'red');
            logger.info('foo bar 2');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: red" ' +
                'color="red" severity="2">[INFO][TEST.LOG.ENABLELOGGER] foo bar 2</font>');
        });

        it('should be able to enable a loggers from scope', function() {
            // disabled by default (no color specified)
            const allLoggers = [
                log.getLogger('test.log.enableLogger1'),
                log.getLogger('test.log.enableLogger2'),
                log.getLogger('test.log.enableLogger3'),
                log.getLogger('test.log.enableLogger4'),
                log.getLogger('test.log.enableLogger5'),
                log.getLogger('test.log2.enableLogger1'),
                log.getLogger('test.log2.enableLogger2'),
                log.getLogger('test.log2.enableLogger3'),
                log.getLogger('test2.log.enableLogger1')
            ];

            allLoggers.forEach((logger, idx) => {
                logger.info('Hello world #' + idx);
            });

            expect(console.log).to.not.have.been.called;
            log.enableLogger('test.log.*', 'red');
            console.log.reset();

            for (let i = 0; i < allLoggers.length; i++) {
                allLoggers[i].info('Hello world #' + i);
            }

            for (let i = 0; i < 5; i++) {
                expect(console.log).to.have.been.calledWith(
                    '<font style="font-size: 14px; color: red" ' +
                    'color="red" severity="2">[INFO][TEST.LOG.ENABLELOGGER' +
                    (i+1) + '] Hello world #' + i + '</font>');
            }
            expect(console.log).to.not.have.been.calledWith(
                '<font style="font-size: 14px; color: red" ' +
                'color="red" severity="2">[INFO][TEST.LOG2.ENABLELOGGER1] Hello world #5</font>');
            expect(console.log).to.not.have.been.calledWith(
                '<font style="font-size: 14px; color: red" ' +
                'color="red" severity="2">[INFO][TEST.LOG2.ENABLELOGGER2] Hello world #6</font>');
            expect(console.log).to.not.have.been.calledWith(
                '<font style="font-size: 14px; color: red" ' +
                'color="red" severity="2">[INFO][TEST.LOG2.ENABLELOGGER3] Hello world #7</font>');
            expect(console.log).to.not.have.been.calledWith(
                '<font style="font-size: 14px; color: red" ' +
                'color="red" severity="2">[INFO][TEST2.LOG.ENABLELOGGER1] Hello world #8</font>');

            log.enableLogger('test', 'blue');
            console.log.reset();

            for (let i = 0; i < allLoggers.length; i++) {
                allLoggers[i].info('Hello again, world #' + i);
            }

            for (let i = 0; i < 5; i++) {
                expect(console.log).to.have.been.calledWith(
                    '<font style="font-size: 14px; color: blue" ' +
                    'color="blue" severity="2">[INFO][TEST.LOG.ENABLELOGGER' +
                    (i+1) + '] Hello again, world #' + i + '</font>');
            }
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blue" ' +
                'color="blue" severity="2">[INFO][TEST.LOG2.ENABLELOGGER1] Hello again, world #5</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blue" ' +
                'color="blue" severity="2">[INFO][TEST.LOG2.ENABLELOGGER2] Hello again, world #6</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blue" ' +
                'color="blue" severity="2">[INFO][TEST.LOG2.ENABLELOGGER3] Hello again, world #7</font>');

            expect(console.log).to.not.have.been.calledWith(
                '<font style="font-size: 14px; color: blue" ' +
                'color="blue" severity="2">[INFO][TEST2.LOG2.ENABLELOGGER1] Hello again, world #' +
                (allLoggers.length - 1) + '</font>');

            log.enableLogger('*', 'purple');
            console.log.reset();

            for (let i = 0; i < allLoggers.length; i++) {
                allLoggers[i].info('Bye bye, world #' + i);
            }
            for (let i = 0; i < 5; i++) {
                expect(console.log).to.have.been.calledWith(
                    '<font style="font-size: 14px; color: purple" ' +
                    'color="purple" severity="2">[INFO][TEST.LOG.ENABLELOGGER' +
                    (i+1) + '] Bye bye, world #' + i + '</font>');
            }
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: purple" ' +
                'color="purple" severity="2">[INFO][TEST.LOG2.ENABLELOGGER1] Bye bye, world #5</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: purple" ' +
                'color="purple" severity="2">[INFO][TEST.LOG2.ENABLELOGGER2] Bye bye, world #6</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: purple" ' +
                'color="purple" severity="2">[INFO][TEST.LOG2.ENABLELOGGER3] Bye bye, world #7</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: purple" ' +
                'color="purple" severity="2">[INFO][TEST2.LOG.ENABLELOGGER1] Bye bye, world #8</font>');
        });
    });

    describe('disableLogger', function() {
        it('should be able to disable a single logger', function() {
            // disabled by default (no color specified)
            const logger = log.getLogger('test.log.disableLogger', 'greenish');
            logger.info('foo bar');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: greenish" ' +
                'color="greenish" severity="2">[INFO][TEST.LOG.DISABLELOGGER] foo bar</font>');
            console.log.reset();
            log.disableLogger('test.log.disableLogger');
            logger.info('foo bar 2');
            expect(console.log).to.not.have.been.called;
        });

        it('should be able to disable a loggers from scope', function() {
            // disabled by default (no color specified)
            const allLoggers = [
                log.getLogger('test.log.disableLogger1', 'blueish'),
                log.getLogger('test.log.disableLogger2', 'blueish'),
                log.getLogger('test.log.disableLogger3', 'blueish'),
                log.getLogger('test.log.disableLogger4', 'blueish'),
                log.getLogger('test.log.disableLogger5', 'blueish'),
                log.getLogger('test.log2.disableLogger1', 'blueish'),
                log.getLogger('test.log2.disableLogger2', 'blueish'),
                log.getLogger('test.log2.disableLogger3', 'blueish'),
                log.getLogger('test2.log.disableLogger1', 'blueish')
            ];

            allLoggers.forEach((logger, idx) => {
                logger.info('Hello world #' + idx);
            });
            for (let i = 0; i < 5; i++) {
                expect(console.log).to.have.been.calledWith(
                    '<font style="font-size: 14px; color: blueish" ' +
                    'color="blueish" severity="2">[INFO][TEST.LOG.DISABLELOGGER' +
                    (i+1) + '] Hello world #' + i + '</font>');
            }
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST.LOG2.DISABLELOGGER1] Hello world #5</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST.LOG2.DISABLELOGGER2] Hello world #6</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST.LOG2.DISABLELOGGER3] Hello world #7</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST2.LOG.DISABLELOGGER1] Hello world #8</font>');

            console.log.reset();
            log.disableLogger('test.log.*');

            for (let i = 0; i < allLoggers.length; i++) {
                allLoggers[i].info('Hello again, world #' + i);
            }

            for (let i = 0; i < 5; i++) {
                expect(console.log).to.not.have.been.calledWith(
                    '<font style="font-size: 14px; color: blueish" ' +
                    'color="blueish" severity="2">[INFO][TEST.LOG.DISABLELOGGER' +
                    (i+1) + '] Hello again, world #' + i + '</font>');
            }
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST.LOG2.DISABLELOGGER1] Hello again, world #5</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST.LOG2.DISABLELOGGER2] Hello again, world #6</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST.LOG2.DISABLELOGGER3] Hello again, world #7</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST2.LOG.DISABLELOGGER1] Hello again, world #8</font>');


            console.log.reset();
            log.disableLogger('test');

            for (let i = 0; i < allLoggers.length; i++) {
                allLoggers[i].info('How you doing, world #' + i);
            }

            for (let i = 0; i < 5; i++) {
                expect(console.log).to.not.have.been.calledWith(
                    '<font style="font-size: 14px; color: blueish" ' +
                    'color="blueish" severity="2">[INFO][TEST.LOG.DISABLELOGGER' +
                    (i+1) + '] How you doing, world #' + i + '</font>');
            }
            expect(console.log).to.not.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST.LOG2.DISABLELOGGER1] How you doing, world #5</font>');
            expect(console.log).to.not.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST.LOG2.DISABLELOGGER2] How you doing, world #6</font>');
            expect(console.log).to.not.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST.LOG2.DISABLELOGGER3] How you doing, world #7</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blueish" ' +
                'color="blueish" severity="2">[INFO][TEST2.LOG.DISABLELOGGER1] How you doing, world #8</font>');

            console.log.reset();
            log.disableLogger('*');

            allLoggers.forEach((logger, idx) => {
                logger.info('Hello world #' + idx);
            });

            expect(console.log).to.not.have.been.called;

        });
    });

    describe('enableLevel', function() {
        it('should enable specific level', () => {
            const hw = log.getLogger('hello.world', 'red');
            const fb = log.getLogger('foo.bar', 'blue');

            hw.debug('hello world');
            fb.debug('foo bar');

            expect(console.log).to.not.have.been.called;

            log.enableLevel('debug');

            hw.debug('hello world');
            fb.debug('foo bar');

            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 10px; color: red"' +
                ' color="red" severity="1">[DEBUG][HELLO.WORLD] hello world</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 10px; color: blue"' +
                ' color="blue" severity="1">[DEBUG][FOO.BAR] foo bar</font>');
        });
    });

    describe('disableLevel', function() {
        it('should enable specific level', () => {
            const hw = log.getLogger('hello.world', 'red');
            const fb = log.getLogger('foo.bar', 'blue');

            hw.error('hello world');
            fb.error('foo bar');

            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 18px; font-weight: bold; color: red"' +
                ' color="red" severity="4">[ERROR][HELLO.WORLD] hello world</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 18px; font-weight: bold; color: blue"' +
                ' color="blue" severity="4">[ERROR][FOO.BAR] foo bar</font>');

            console.log.reset();
            log.disableLevel('error');

            hw.error('hello world');
            fb.error('foo bar');

            expect(console.log).to.not.have.been.called;

            hw.info('hello world');
            fb.info('foo bar');

            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: red"' +
                ' color="red" severity="2">[INFO][HELLO.WORLD] hello world</font>');
            expect(console.log).to.have.been.calledWith(
                '<font style="font-size: 14px; color: blue"' +
                ' color="blue" severity="2">[INFO][FOO.BAR] foo bar</font>');
        });
    });
});
