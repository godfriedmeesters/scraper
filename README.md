
## System Requirements

DiffScraper bots need a connection to a central Redis database (to receive jobs from the controller and synchronize with other bots). 

On every machine where bots will be deployed, the following requirements:
-  Docker runtime (Docker-Compose and Kubernetes deployment files are provided)
- For mobile phone scraping:
	- [Appium Server](https://appium.io/ "Appium Server")
	- A physical Android Smartphone or and Android Emulator (the command `adb devices` should return at least one device)

## Installation Guide

DiffScraper Bot can be installed on any enviroment where Docker containers can be deployed.  In this guide, I describe how to deploy bots, specialized in desktop web scraping, on a Kubernetes cluster. I also describe how to deploy one bot specialized in mobile phone scraping on a dedicated Windows machine. 

