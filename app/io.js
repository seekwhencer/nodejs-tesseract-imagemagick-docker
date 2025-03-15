import {opendirSync, existsSync, statSync, watch} from 'node:fs';
import KazEvents from "./event.js";
import KazIOFile from "./ioFile.js";

export default class KazIO extends KazEvents {
    constructor(options) {
        super(options);

        this.sourceRootPath = options?.sourceRootPath || global?.KAZ?.PATH_SOURCE_ROOT || `/kaz/source`;
        this.targetRootPath = options?.targetRootPath || global?.KAZ?.PATH_TARGET_ROOT || `/kaz/target`;

        LOG('-------------');
        LOG('IO:', this.sourceRootPath, 'TO:', this.targetRootPath);
        LOG('-------------','\n');

        // the source of true as proxy
        this.source = new Proxy({}, {
            get: (target, prop, receiver) => target[prop],
            set: (target, key, data) => {
                target[key] = new KazIOFile(this, data);
                this.emit('source-added', key, target[key]);
                return true;
            }
        });

        // watch the source root folder for created or deleted files
        this.watch = watch(this.sourceRootPath, {
            encoding: 'buffer',
            recursive: true,
            persistent: true
        });

        // debounce timeout to start get pages
        this.timeoutCreate = false;

        // if any changes happens on the source root folder
        this.watch.on('change', (e, f) => {
            if (e === 'change') // break first, when it is not a rename event
                return;

            const realPath = `${this.sourceRootPath}/${f}`;

            // create a new one, if not exists
            if (!this.source[realPath]) {
                this.source[realPath] = {
                    realPath: realPath,
                    isDir: false
                };

                // debounce
                this.timeoutCreate ? clearTimeout(this.timeoutCreate) : null;
                this.timeoutCreate = setTimeout(() => this.getPageCount(), KAZ.FILE_CREATE_DEBOUNCE);

                LOG('CREATED', realPath, Object.keys(this.source).length);
            } else { // delete a source entry, if file was deleted
                if (!existsSync(realPath)) {
                    delete this.source[realPath];
                }
                LOG('DELETED', realPath, Object.keys(this.source).length);
            }
        });

        // on indexed event
        this.on('indexed', () => {
            LOG('INDEXING COMPLETE', Object.keys(this.source).length, '\n');
            LOG('COUNTING PAGES...');
            this.getPageCount();
        });

        // when all pages count
        this.on('pages-count', () => {
            LOG('COUNTING PAGES COMPLETE', '\n');
            LOG('CONVERTING...');
            this.convert();
        });

        // when all pages converted
        this.on('converted', () => {
            LOG('DOCUMENTS CONVERTED', '\n');
            LOG('RECOGNIZING...');
            this.recognize();
        });

        this.on('recognized', () => {
            LOG('DOCUMENTS RECOGNIZED', '\n');
            LOG('FINISHED...');
            this.emit('finished');
        });
    }

    // first call
    run() {
        return this.createIndex();
    }

    createIndex() {
        LOG('INDEXING...');

        return new Promise((resolve, reject) => {
            this.indexing().then(() => {
                this.emit('indexed');
                resolve(true);
            }).catch(err => reject(err));
        });
    }

    async indexing() {
        try {
            const dir = opendirSync(this.sourceRootPath, {
                recursive: true
            });
            for await (const i of dir) {
                i.realPath = `${i.path}/${i.name}`;
                i.isDir = statSync(i.realPath).isDirectory();
                i.converted = false;
                i.recognized = false;
                i.pages = false;

                if (!i.isDir && i.name.includes(KAZ.FILE_MATCH) && i.name.includes('.pdf')) {
                    this.source[i.realPath] = i;
                }
            }
        } catch (err) {
            return Promise.reject(err);
        }
    }

    getPageCount() {
        const keys = Object.keys(this.source);
        const next = keys.filter(k => this.source[k].pages === false)[0];

        if (!next) {
            this.emit('pages-count');
            return;
        }

        if (!this.source[next])
            return;

        this.source[next].getPageCount();
    }

    convert() {
        const keys = Object.keys(this.source);
        const next = keys.filter(k => this.source[k].converted === false)[0];

        if (!next) {
            this.emit('converted');
            return;
        }

        if (!this.source[next])
            return;

        this.source[next].convert();
    }

    recognize() {
        const keys = Object.keys(this.source);
        const next = keys.filter(k => this.source[k].recognized === false)[0];

        if (!next) {
            this.emit('recognized');
            return;
        }

        if (!this.source[next])
            return;

        this.source[next].recognize();
    }
}