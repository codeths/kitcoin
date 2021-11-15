# kitcoin-frontend

A frontend for Kitcoin made with Svelte

**This is a submodule for [chromezoneeths/kitcoin](https://github.com/chromezoneeths/kitcoin).**

## Setup

Make sure Node.js and npm are installed.  
To install the required packages run the command below:

```bash
npm install
```

## Building

Building the frontend is pretty easy, just run the command below:

```bash
npm run build
```

This will create a folder called "build" containing the newly built frontend.  
If you're going to serve the build, make sure your server is set up to serve `index.html` as the 404 page. This is needed because routify puts the entire frontend in one place, and determines which view to show based on the path, which won't always just be the root.

As of writing, there is currently a placeholder page at the root (/) with links to the current pages.

Current pages (as of writing):

-   Student page (/student)
-   Staff page (/staff)
-   Store page (/store)

## Development

[Svelte](https://svelte.dev/) and [Routify](https://www.routify.dev/) are used with [Tailwind CSS](https://tailwindcss.com/) to make the frontend, and [Vite](https://vitejs.dev/) is used for builds.

To start the dev server, run the command below:

```bash
npm run dev
```

This starts a local server hosting the frontend that updates as you save. The page will update as soon as you save a change, so you don't need to worry about reloading the page.  
You can access the page by opening [localhost:8080](https://localhost:8080) once the dev server is up and running.
