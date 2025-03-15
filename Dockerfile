FROM jitesoft/tesseract-ocr:alpine

ENV NODE_VERSION 20.15.1-r0
ENV NPM_VERSION 10.9.1-r0

USER root
RUN train-lang deu --best

RUN apk -q update
RUN apk -q --no-progress add --no-cache imagemagick imagemagick-pdf \
    && apk -q --no-progress add nodejs="$NODE_VERSION" \
    && apk -q --no-progress add npm="$NPM_VERSION"

WORKDIR /kaz
COPY package.json .
COPY package-lock.json .
COPY app ./app

RUN npm install
