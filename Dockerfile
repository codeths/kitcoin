FROM node:16-alpine
RUN apk add g++ make python3
WORKDIR /app
RUN mkdir frontend

COPY package*.json .
COPY frontend/package*.json ./frontend
RUN npm install
COPY src ./src
COPY tsconfig.json src/config/keys.example.json gulpfile.js .
RUN cp src/config/keys.example.json src/config/keys.json
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public
COPY frontend/*.config.js frontend/*rc* frontend/index.html ./frontend
RUN npm run build:production
RUN rm -rf src tsconfig.json gulpfile.js frontend/src frontend/public frontend/*.config.js frontend/*rc*
CMD ["node", "."]