FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install --prefix backend --omit=dev && npm install --prefix frontend
COPY . .
RUN npm run build --prefix frontend
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "backend/src/server.js"]
