# node.js, tesseract and imagemagick in one container

*This piece of software was made to bring my Kontoauszüge in a computer readable format.*

node.js orchestrates the command line tools: `identify` and `convert` from imagemagick
and `tesseract` who are available in theis container. you have to build the container.

- Build docker image
```
docker-compose build --no-cache
```

- Run. It starts `npm start`
 ```bash
 docker-compose up -d
 ```
- Or use it in dev mode
 ```bash
 docker-compose -f docker-compose-dev.yaml up -d

# then
 docker exec -it kaz /bin/bash

# and
 npm start

# or instead of a open console
 docker exec -it kaz /bin/bash -c "npm start"
 ```
 
## Testing
- Image conversion. PDF to JPG
```bash
convert -density 1000 -trim /kaz/source/test.pdf /kaz/source/test.jpg
```
- OCR recognition
```bash
tesseract -l deu /kaz/source/test-0.jpg stdout --psm 4
```

## Configure
Just edit the `app/globals.js`


## Programm flow

- all pdf files will be indexed on startup
- page numbers from all pdf files will be extracted with `identify`
- images per page created with `convert`
- all images recognized with `tesseract`
- data written in a json file per pdf

## Watch task

> You can place a new pdf file on runtime somewhere in the source folder. The app starts instantly the recognition process.

## Next
I dont know... strapi? mysql? sqlite? json? (it is **json** at the moment) 

## But

The regex and the following transformation to extract the data is especially made for a PDF Kontoauszug from the Deutsche Bank.
To change it, just edit the file: `app/ioFile.js` and change the regex and the post processing.

```js
transform() {
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
```
 