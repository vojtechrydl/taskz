FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY prisma ./prisma/
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start"]
