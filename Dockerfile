FROM node:10-alpine
RUN apk add --no-cache make gcc g++ python
RUN mkdir -p /home/node/app
COPY . /home/node/app
RUN chown -R node:node /home/node/app
WORKDIR /home/node/app
USER node
RUN npm install
EXPOSE 5000
CMD ["npm", "start"]