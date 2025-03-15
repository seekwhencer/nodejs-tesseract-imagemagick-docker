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

 