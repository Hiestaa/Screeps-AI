/**
 * Logging utilities for the screeps ai.
 * Logging is scoped by domain. To instanciate a logger, call:
 * `const logger = log.getLogger('my.file.name'[, color])`. Loggers can be enabled
 * and disabled by calling `log.enableLogger('[my[.file[.name]]]'[, color])` or
 * `log.disableLogger('[my[.file[.name]]]').
 * Logging supports the following log levels, which can be enabled and disabled
 * independently by calling `log.enableLevel(level)` or `log.disabledLevel(level)`:
 * Where level is any of :
 * * `debug`: for debugging information about a specific algorithm
 * * `info`: for regula information about the state of the system
 * * `warning`: for unusual things happening in the system, or danger to be aware of
 * * `error`: for algorithms unexpected errors, which can impact the behavior of the AI
 * * `fatal`: errors we cannot recover from, that may interrupt the execution of a tick
 * * `failure`: failures associated with game actions, will be ranslated as strings
 *               based on the provided error code.
 * Beware that the `logger.failure` method has a different prototype than the other
 * methods, since it takes the error code as parameter on top of the error message.
 **/

/* Cache logger instances, this won't persist forever tho
 * hierarchical scoping to speed up activate and deactivate calls
 * (e.g.: loggers.tasks.actor.spawn contains the 'tasks.actor.spawn' logger)
 */
const loggers = {__store: true};
/* Persist loggers state accross ticks */
Memory.loggers = Memory.loggers || {};

const LEVEL_STYLES = {
    debug: 'font-size: 11px',
    info: 'font-size: 14px',
    warning: 'font-size: 16px; style: italic',
    error: 'font-size: 18px; font-weight: bold',
    fatal: 'font-size: 20px; font-weight: bold; style: italic',
    failure: 'font-size: 16px; style: italic'
};

const LEVEL_SEVERITY = {
    debug: 1,
    info: 2,
    warning: 3,
    error: 4,
    fatal: 5,
    failure: 3
};

const ERRORS = [
    'OK',
    'ERR_NOT_OWNER',
    'ERR_NO_PATH',
    'ERR_NAME_EXISTS',
    'ERR_BUSY',
    'ERR_NOT_FOUND',
    'ERR_NOT_ENOUGH_RESOURCES',
    'ERR_INVALID_TARGET',
    'ERR_FULL',
    'ERR_NOT_IN_RANGE',
    'ERR_INVALID_ARGS',
    'ERR_TIRED',
    'ERR_NO_BODYPART',
    'ERR_NOT_ENOUGH_EXTENSIONS',
    'ERR_RCL_NOT_ENOUGH',
    'ERR_GCL_NOT_ENOUGH',
];

const CODE_TO_ERROR = {};
exports.codeToError = code => CODE_TO_ERROR[code];

ERRORS.forEach((name, idx) => CODE_TO_ERROR[(idx * -1)] = CODE_TO_ERROR[(idx * -1)] || name);

/**
 * LevelLogger is a common object instance that manages the enabled / disabled
 * state of specific log levels.
 * All loggers will call into the same instance, so that all logger levels can
 * be enabled or disabled all at the same time efficiently.
 */
class LevelLogger {
    constructor() {
        Memory.levelLogger = Memory.levelLogger || {
            // default level state, if no state is defined in memory
            debug: false,
            info: true,
            warning: true,
            error: true,
            fatal: true,
            failure: true
        };
        Object.keys(LEVEL_STYLES).forEach(lvl => {
            if (Memory.levelLogger[lvl]) {
                this[lvl] = this._log(lvl);
            }
            else {
                this[lvl] = () => {};
            }
        });
    }

    _log(level) {
        return (message, color, highlight) => {
            const levelStyle = LEVEL_STYLES[level] || LEVEL_STYLES.debug;
            const severity = LEVEL_SEVERITY[level] || 0;
            console.log(
                `<font style="${levelStyle}; color: ${color}" ` +
                (highlight ? 'type="highlight" ' : '') +
                `color="${color}" severity="${severity}">` +
                `[${level.toUpperCase()}]${message}</font>`);
        };
    }

    _enable(level) {
        if (!LEVEL_STYLES[level]) { level = 'debug'; }
        this[level] = this._log(level);
        Memory.levelLogger[level] = true;
    }

    _disable(level) {
        if (!LEVEL_STYLES[level]) { level = 'debug'; }
        this[level] = () => {};
        Memory.levelLogger[level] = false;
    }
}

let levelLogger = new LevelLogger();

/**
 * Main class for logging capabilities.
 * Do not instanciate directly, call `logger.getLogger(filename)` instead.
 * The logger will use the file name to index its current state in Memory.
 * Upon instanciation, the default state can be given to be used if no state
 * can be found in memory (by providing a color, the logger will be enabled
 * with that specific color)
 */
class Logger {
    constructor(filename, color) {
        this.filename = filename;
        let state = Memory.loggers[filename];
        if (!state) {
            Memory.loggers[filename] = state = {color};
        }

        // only enable if a color was provided (indicating enabled by default)
        // or a color was found in memory (indicating it has an enabled stae)
        this.color = state.color;
        if (this.color) {
            this.log = this._log.bind(this);
        }
    }

    _log(level, message, highlight) {
        levelLogger[level](
            `[${this.filename.toUpperCase()}] ${message}`,
            this.color, highlight);
    }

    log() {}

    _enable(color) {
        this.color = color;
        this.log = this._log.bind(this);
        Memory.loggers[this.filename] = {color};
    }

    _disable() {
        this.log = () => {};
        Memory.loggers[this.filename] = {};
    }

    debug(message, highlight) {
        this.log('debug', message, highlight);
    }

    info(message, highlight) {
        this.log('info', message, highlight);
    }

    warning(message, highlight) {
        this.log('warning', message, highlight);
    }

    error(message, highlight) {
        this.log('error', message, highlight);
    }

    fatal(message, highlight) {
        this.log('fatal', message, highlight);
    }

    failure(code, message, highlight) {
        message = `[Failure: ${CODE_TO_ERROR[code] || code}] ${message}`;
        this.log('failure', message, highlight);
    }
}

/**
 * Returns the logger for the given filename, or create a new logger for the
 * given file name and color and return it.
 * @param {String} filename - filename, should be scoped down by dots (`.`)
 *                            e.g.: `objectives.actor.ExpandPopulation`
 * @param {String} color - default color to apply to this logger, if no
 *                         color state is saved in memory.
 *                         Also enable the logger by default if provided.
 * @return {Logger} - the existing logger instance if it exists, a newly
 *                    built logger instance if it does not.
 */
exports.getLogger = (filename, color) => {
    const location = filename.split('.');
    let pointer = loggers;

    // go down the scope chain, creating mappings as necessary
    // stop before dereferencing the last position on purpose
    for (var i = 0; i < location.length - 1; i++) {
        if (!pointer[location[i]]) {
            // mark this as a '__store' so recursive lookup
            // can know the difference between a store object and a
            // logger object
            pointer[location[i]] = {__store: true};
        }
        pointer = pointer[location[i]];
    }

    // no pointer should be the object that contains the logger instance
    // accessing `pointer[location[location.length - 1]]` should yield the
    // logger or undefined if no logger was defined yet
    const key = location[location.length - 1];
    if (pointer[key]) { return pointer[key]; }

    pointer[key] = new Logger(filename, color);
    return pointer[key];
};

function recurseFindAllLoggers(pointer) {
    if (!pointer.__store) { return [pointer]; }
    // each item will return an array of 1 or more loggers
    const loggers = Object.keys(pointer).filter(k => k != '__store').map(k => {
        return recurseFindAllLoggers(pointer[k]);
    });
    // we need to flatten the result
    return [].concat(...loggers);
}

function findLoggers(scope) {
    let pointer = loggers;
    const logLoc = (scope ? scope.split('.') : ['*']);
    for (var i = 0; i < logLoc.length; i++) {
        if (logLoc[i] === '*') { break; }  // only allowed as the last item
        if (!pointer[logLoc[i]]) {
            pointer[logLoc[i]] = {};
        }
        pointer = pointer[logLoc[i]];
    }

    return recurseFindAllLoggers(pointer);
}

/**
 * Enable all loggers falling under the given scope
 * @param {string} scope - the scope of the loggers to enable, or the string
 *                 '*' to enable all loggers at once.
 *                 e.g. `objectives.actor[.*]` to enable all actor objectives
 * @param {string} color - the color to use for this logger
 * @return {integer} - returns the number of loggers affected.
 */
exports.enableLogger = (scope, color) => {
    const foundLoggers = findLoggers(scope);
    foundLoggers.forEach(logger => {
        logger._enable(color);
    });
    return foundLoggers.length;
};

/**
 * Disable all logers falling under the given scope
 * @param {string} scope - the scope of the loggers to disable, identical to `enableLogger`
 * @return {integer} - return the number of loggers affected.
 */
exports.disableLogger = (scope) => {
    const foundLoggers = findLoggers(scope);
    foundLoggers.forEach(logger => {
        logger._disable();
    });
    return foundLoggers.length;
};

/**
 * Enable the given logging level for all loggers.
 * This is independent from other levels in that 'debug' can solely be enabled
 * without necessarily enabling levels above.
 * @param {String} level - level to enable, one of 'debug', 'info', 'warning',
 *                 'error', 'fatal' or 'failure'. Fall back on 'debug' if anything
 *                 else is provided.
 */
exports.enableLevel = (level) => {
    levelLogger._enable(level);
};

/**
 * Disable the given logging level for all loggers.
 * This is independent from other levels in that 'fatal' can solely be disabled
 * without necessarily disabling levels below.
 * @param {String} level - level to disable, one of 'debug', 'info', 'warning',
 *                 'error', 'fatal' or 'failure'. Fall back on 'debug' if anything
 *                 else is provided.
 */
exports.disableLevel = (level) => {
    levelLogger._disable(level);
};

exports.listLoggers = () => {
    console.log('[INFO][LOG] Currently enabled loggers:');
    Object.keys(Memory.loggers).forEach(k => {
        const logger = Memory.loggers[k];
        const color = logger.color || '#CBCBCB';
        const style = logger.color ? 'font-size: 14px' : 'font-size: 10px';
        console.log(
            `<font style="${style}; color: ${color}" ` +
            `color="${logger.color}" severity="3">` +
            `                ${k}</font>`);
    });
};
