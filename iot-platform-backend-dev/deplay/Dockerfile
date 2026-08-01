FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY --chown=node:node src ./src
COPY --chown=node:node tsconfig.json ./

EXPOSE 3001

USER node

CMD ["npm", "run", "start:docker"]
