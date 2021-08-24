#DiffScraper Bot

As part of  [DiffScraper](https://github.com/godfriedmeesters/diffscraper "DiffScraper"), one or more bots can be deployed. Ready-to-use bots are provided that can extract offers from mobile applications, mobile websites and desktop websites. 

## System Requirements

DiffScraper bots need a connection to a central Redis database (to receive jobs from the controller and synchronize with other bots). 

On every machine where bots will be deployed, the following requirements:
-  Docker runtime (Docker-Compose and Kubernetes deployment files are provided)
- For mobile phone scraping:
	- [Appium Server](https://appium.io/ "Appium Server")
	- A physical Android Smartphone or and Android Emulator (the command `adb devices` should return at least one device)

## Installation Guide

DiffScraper Bot can be installed on any enviroment where Docker containers can be deployed.  In this guide, I describe how to deploy bots, specialized in desktop web scraping, on a Kubernetes cluster. I also describe how to deploy one bot specialized in mobile phone scraping on a dedicated Windows machine. 

Deploying a desktop website bot is the easiest, since no extra depencies are needed (e.g. a headful Chrome browser is included in the Dockerfile).   To deploy two desktop website bots on Kubernetes cluster,  run the following command:
`kubectl --kubeconfig="my-kubeconfig.yaml" apply -f webscraper-kubernetes-deployment.yaml`
