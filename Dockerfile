FROM ubuntu:20.04

RUN apt-get update &&  apt-get clean

ENV DEBIAN_FRONTEND=noninteractive
RUN ln -fs /usr/share/zoneinfo/Europe/Brussels /etc/localtime
RUN apt-get install -y tzdata
RUN dpkg-reconfigure --frontend noninteractive tzdata

RUN apt-get install -y \
#    gnupg2 \
    nano \
   # x11vnc \
   # xvfb \
#    fluxbox \
#    wmctrl \
    wget \
    npm
#    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
#    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
 #   && apt-get update && apt-get -y install google-chrome-stable

RUN useradd apps \
    && mkdir -p /home/apps/.config \
    && chown -v -R apps:apps /home/apps

# COPY bootstrap.sh /
# RUN chmod +x /bootstrap.sh


RUN mkdir  -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json tsconfig.json ./
#ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD 1
#ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser
RUN npm install
RUN npm install -g typescript
RUN npm install -g ts-node

RUN mkdir /usr/src/app/compressedScreenshots
RUN chown -v -R apps:apps /usr/src/app/compressedScreenshots
RUN mkdir /usr/src/app/screenshots
RUN chown -v -R apps:apps /usr/src/app/screenshots
RUN mkdir /usr/src/app/recycledCookies
RUN chown -v -R apps:apps /usr/src/app/recycledCookies

COPY . .

#ENV DISPLAY=:1.0

#CMD '/bootstrap.sh'

