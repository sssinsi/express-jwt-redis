FROM node:6.9.1

RUN apt-get update
#RUN apt-get install -y redis-server
#RUN /etc/init.d/redis-server restart
#RUN echo 'maxmemory 1024000' >> /etc/redis/redis.conf

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY ./express_app/package.json /usr/src/app/
RUN npm install

COPY ./express_app /usr/src/app/

EXPOSE 8888

#CMD sh ./start_script.sh
CMD ["npm", "start"]