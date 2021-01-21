FROM zenika/alpine-chrome:with-node

USER root

RUN mkdir screenshots
RUN mkdir compressedScreenshots

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD 1
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser

COPY package.json tsconfig.json ./
RUN npm install
RUN npm install -g typescript
RUN npm install -g ts-node
RUN apk add bash nano

COPY . .

WORKDIR /usr/src/app

CMD [ "ts-node", "scraper.ts" ]