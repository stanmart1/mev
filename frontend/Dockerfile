FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ linux-headers eudev-dev libusb-dev

COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=optional

COPY . .
RUN npm run build

RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
