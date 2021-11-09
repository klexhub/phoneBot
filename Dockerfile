FROM node:16-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm install typescript -g
COPY . .
RUN tsc


FROM node:16-alpine as deploy
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --prod

COPY --from=builder /app/build .
CMD ["node", "app.js"]