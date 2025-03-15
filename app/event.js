import {EventEmitter} from 'node:events';

export default class KazEvents {
    constructor(props) {
        this.event = new EventEmitter();
    }
    on() {
        this.event.on.apply(this.event, Array.from(arguments));
    }

    emit() {
        this.event.emit.apply(this.event, Array.from(arguments));
    }

    removeListener() {
        this.event.removeListener.apply(this.event, Array.from(arguments));
    }

    removeAllListeners() {
        this.event.removeAllListeners.apply(this.event, Array.from(arguments));
    }

}