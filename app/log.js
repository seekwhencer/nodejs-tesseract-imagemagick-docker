import dateFormat from 'dateformat';

export default class ClassLog {
    constructor() {
        this.label = 'LOGGER';
    }

    log() {
        if (global.DEBUG === false) {
            return false;
        }
        let output = [
            '[',
            dateFormat(new Date(), "H:MM:ss - d.m.yyyy"),
            ']'
        ].concat(Array.from(arguments));
        console.log.apply(console, output);
    }

    error() {
        if (global.DEBUG === false) {
            return false;
        }
        let output = [
            '[',
            dateFormat(new Date(), "H:MM:ss - d.m.yyyy"),
            ']'
        ].concat(Array.from(arguments));
        console.error.apply(console, output);
    }
}

const Logger = new ClassLog();
global.LOG = Logger.log;
global.ERROR = Logger.error;
