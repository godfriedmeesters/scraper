# DiffScraper Bot

As part of  [DiffScraper](https://github.com/godfriedmeesters/diffscraper "DiffScraper"), one or more bots can be deployed. Ready-to-use bots are[ provided ](https://github.com/godfriedmeesters/scraper/tree/main/companies " provided ")that can extract offers from mobile applications, mobile websites and desktop websites. 

## System Requirements

DiffScraper bots need a connection to a central Redis database (to receive jobs from the controller and synchronize with other bots).  In addition, all bots need a connection to a central FTP server (to upload screenshots).  The Redis Database connection can be set in DB_HOST, DB_PORT, DB_PASS in the [.env file](https://github.com/godfriedmeesters/scraper/blob/main/.env ".env file"); FTP connection details can be set in FTP_USER, FTP_PASS, FTP_HOST.   

On every machine where bots will be deployed, the following requirements:
-  Docker runtime (Docker-Compose and Kubernetes deployment files are provided)
- For mobile phone scraping:
	- [Appium Server](https://appium.io/ "Appium Server")
	- A physical Android Smartphone or and Android Emulator (the command `adb devices` should return at least one device)

## Installation Guide

DiffScraper Bot can be installed on any enviroment where Docker containers can be deployed.  In this guide, I describe how to deploy bots, specialized in desktop web scraping, on a Kubernetes cluster. I also describe how to deploy one bot specialized in mobile phone scraping on a dedicated Windows machine. 

### Desktop website bot deployment

Deploying a desktop website bot is the easiest, since no extra depencies are needed (e.g. a headful Chrome browser is included in the Dockerfile).   To deploy desktop website bots on a Kubernetes cluster,  run the following command (see [webscraper-kubernetes-deployment.yaml](https://github.com/godfriedmeesters/scraper/blob/main/config/webscraper-kubernetes-deployment.yaml "webscraper-kubernetes-deployment.yaml")):
`kubectl --kubeconfig="my-kubeconfig.yaml" apply -f webscraper-kubernetes-deployment.yaml`

This command will launch a ReplicaSet with two bots, and automatically connect to Redis to start processing scraping jobs.

To help in tracking scraping errors, logs of every bot can be centralized in ElasticSearch. A Kubernetes script is provided to send all bot logs to an ElasticSearch server:
`kubectl --kubeconfig="my-kubeconfig.yaml" create -f filebeat-kubernetes.yaml`



### Mobile application bot deployment

Deploying a mobile application web bot on a on-premise machine can be done with the provided `docker-compose` files. For example, to start a mobile application bot that connects to a real device smartphone, use `docker-compose up -f  docker-compose.scraper.realdevice.yml` (see [docker-compose.scraper.realdevice.yml](https://github.com/godfriedmeesters/scraper/blob/main/config/docker-compose.scraper.realdevice.yml")). It is assumed that an Appium server is started and listing for connections on the IP address specified by the APPIUM_HOST in the [.env file](https://github.com/godfriedmeesters/scraper/blob/main/.env ".env file").  

All logs will be sent to the ElasticSearch server specified in [filebeat.yml](https://github.com/godfriedmeesters/configfiles/blob/main/filebeat.yml "filebeat.yml"). 

## DiffScraper Bot CLI

In a production system, a bot receives scraping jobs via a central Redis queue from the [controller](https://github.com/godfriedmeesters/controller "controller").  

To test a (new) bot, it is possible to bypass the job queue and test the bot locally from within its Docker container.

For example, to start scraping offers from the French website of Opodo:

Enter  into an Opodo bot:
`kubectl --kubeconfig="my-kubeconfig.yaml" exec --stdin --tty  webscraper-deployment--1   -- /bin/bash`

This command will extract all offers from opodo.fr:
`ts-node scrape OpodoWebScraper inputData.json --lang=fr`
