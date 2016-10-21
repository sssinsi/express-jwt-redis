FROM node:6.9.1

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY ./express_app/package.json /usr/src/app/
RUN npm install

COPY ./express_app /usr/src/app/

EXPOSE 8888

CMD ["npm", "start"]