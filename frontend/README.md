# kitcoin-frontend
A frontend for Kitcoin made with Svelte

**So far, this is nothing but a template or placeholder, so anything like shop items and images are temporary, and won't be kept in this repo in the future**

## Setup

Make sure Node.js and npm are installed.  
To install the required packages run the command below:
```bash
npm install
```

## Building

Building the frontend is pretty easy, just run the command below:
```bash
npx snowpack build
```
This will create a folder called "build" containing the newly built frontend.  

## Development
Svelte is used with Tailwind CSS to make the frontend, and Snowpack is used for builds.
As of right now, the frontend does not use actual data, so everything so far is just coded into the pages. Because it isn't hooked up to the backend yet, you don't need the backend for development.

To start the dev server, run the command below:
```bash
npx snowpack dev
```
This should open a new browser tab with the page open. The page will update as soon as you save a change, so you don't need to worry about reloading the page.  
You can also access the page by opening [localhost:8080](https://localhost:8080) once the dev server is up and running.
