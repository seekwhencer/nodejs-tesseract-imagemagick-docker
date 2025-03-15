import {existsSync, writeFileSync} from 'node:fs';
import {mkdirpSync} from 'fs-extra';
import {spawn} from "node:child_process";
import KazEvents from "./event.js";

export default class KazIOFile extends KazEvents {
    constructor(parent, options) {
        super(parent, options);
        this.io = parent;

        this.targetRootPath = this.io.targetRootPath;
        this.realPath = options.realPath;
        this.name = options.name || this.realPath.split('/')[this.realPath.split('/').length - 1];
        this.isDir = options.isDir || false;
        this.converted = false;
        this.recognized = false;
        this.pages = false;
        this.raw = false;
        this.data = [];

        this.on('pages-set', () => {
            LOG('PAGE COUNT', this.pages, this.baseName);
            this.io.getPageCount();
        });

        this.on('converted', () => {
            LOG('CONVERTED', this.baseName);
            this.io.convert();
        });

        this.on('conversion-skipped', () => {
            LOG('SKIPPING CONVERSION', this.pages, 'PAGES FROM', this.name);
            this.io.convert();
        });

        this.on('recognized', () => {
            LOG('RECOGNIZED', this.baseName);
            this.saveData();
        });

        this.on('image-recognized', (index, output) => {
            LOG('IMAGE RECOGNIZED:', index + 1, 'FROM', this.pages);
            this.raw += output;
            this.recognizeOne(index + 1);
        });

        this.on('data-saved', () => {
            LOG('DATA SAVED', this.baseName);
            this.io.recognize();
        });

        this.process = {
            identify: false,
            convert: false,
            recognize: false
        };
    }

    getPageCount() {
        if (this.pages !== false)
            return;

        const options = ['-ping', '-format', '%n-', this.realPath];
        const bin = '/usr/bin/identify';
        let output = '';

        this.process.identify = spawn(bin, options);
        this.process.identify.stdout.setEncoding('utf8');
        this.process.identify.stderr.setEncoding('utf8');

        this.process.identify.stdout.on('data', chunk => output += chunk.trim());
        this.process.identify.stderr.on('end', () => {
            this.pages = output.split('-')[0];
            this.emit('pages-set');
        });
    }

    convert() {
        if (this.converted !== false)
            return;

        if (this.imagesExists()) {
            this.converted = true;
            this.emit('conversion-skipped');
            return;
        }

        this.checkAndCreateFolder();

        LOG('CONVERTING', this.pages, 'PAGES FROM', this.name);

        const options = ['-density', 1000, '-trim', this.realPath, `${this.targetRootPath}/images/${this.baseName}.jpg`];
        const bin = '/usr/bin/convert';
        let output = '';

        this.process.convert = spawn(bin, options);
        this.process.convert.stdout.setEncoding('utf8');
        this.process.convert.stderr.setEncoding('utf8');

        this.process.convert.stdout.on('data', chunk => output += chunk.trim());
        this.process.convert.stderr.on('end', () => {
            this.converted = true;
            this.emit('converted');
        });
    }

    imagesExists() {
        let exists = 0;
        for (let i = 0; i < this.pages; i++) {
            const imageName = `${this.baseName}-${i}.jpg`;
            if (existsSync(`${this.targetRootPath}/images/${imageName}`))
                exists++;
        }
        return exists >= this.pages;
    }

    recognize() {
        if (this.recognized !== false)
            return;

        LOG('RECOGNIZING', this.pages, 'PAGES FROM', this.name);
        this.raw = '';
        this.recognizeOne(0);
    }

    recognizeOne(index) {
        if (index >= this.pages) {
            this.recognized = true;
            this.emit('recognized');
            return;
        }

        const image = `${this.targetRootPath}/images/${this.baseName}-${index}.jpg`;
        const options = ['-l', 'deu', image, 'stdout', '--psm', 4];
        const bin = '/usr/local/bin/tesseract';
        let output = '';

        this.process.recognize = spawn(bin, options);
        this.process.recognize.stdout.setEncoding('utf8');
        this.process.recognize.stderr.setEncoding('utf8');

        this.process.recognize.stdout.on('data', chunk => output += chunk.trim());
        this.process.recognize.stderr.on('end', () => this.emit('image-recognized', index, output));
    }

    saveData() {
        const realPathData = `${this.targetRootPath}/data/${this.baseName}.json`;
        this.transform();

        try {
            writeFileSync(realPathData, JSON.stringify(this.data));
            this.emit('data-saved');
        } catch (err) {
            console.error(err);
            this.emit('data-saved');
        }
    }

    transform() {
        //@TODO place it outside as plug in from the config... or something

        const regex = /^(?<date_a>\d{2}\.\d{2}\.?)\s+(?<date_b>\d{2}\.\d{2}\.?)\s+(?<title>.+?)\s+(?<amount>[+-]\s?\d{1,3}(?:\.\d{3})*,\d{2})\r?\n+?^(?<year_a>\d{4})\s+(?<year_b>\d{4})\s+(?<info>(?:(?!\d{2}\.\d{2}\.?\s+\d{2}\.\d{2}).*(?:\r?\n|$))*)/gm

        const rawData = [...this.raw.matchAll(regex)].map(match => ({
            date_a: match?.groups?.date_a?.trim(),
            date_b: match?.groups?.date_b?.trim(),
            year_a: match?.groups?.year_a?.trim(),
            year_b: match?.groups?.year_b?.trim(),
            title: match?.groups?.title?.trim(),
            amount: match?.groups?.amount?.replace(/\s/g, '').replace('.', '').replace(',', '.'),
            info: match?.groups?.info?.trim().replace(/\r?\n/g, ' ').split('BIC (SWIFT) DEUTDEDBLEG')[0].split('Fillalnummer')[0]
        }));

        this.data = rawData.map(i => {
            return {
                date_a: `${i?.date_a}${i?.year_a}`,
                date_b: `${i?.date_b}${i?.year_b}`,
                title: i?.title,
                amount: parseFloat(i?.amount),
                info: i?.info
            }
        });
    }

    checkAndCreateFolder() {
        const targetImageFolder = `${this.targetRootPath}/images`;
        const targetDataFolder = `${this.targetRootPath}/data`;
        !existsSync(targetImageFolder) ? mkdirpSync(targetImageFolder) : null;
        !existsSync(targetDataFolder) ? mkdirpSync(targetDataFolder) : null;
    }

    get imageSet() {
        const images = [];
        for (let i = 0; i < this.pages; i++) {
            images.push(`${this.targetRootPath}/images/${this.baseName}-${i}.jpg`);
        }
        return images;
    }

    set imageSet(val) {
        // do nothing
    }

    get baseName() {
        return this.name.replace('.pdf', '');
    }

    set baseName(val) {
        // none
    }
}