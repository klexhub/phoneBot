FROM mhart/alpine-node:16
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --prod

COPY ./build .
CMD ["node", "app.js"]