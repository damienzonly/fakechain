FROM node:16-alpine as build_stage

WORKDIR /app/build
COPY src src
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY yarn.lock yarn.lock

RUN yarn install && yarn build && rm -rf node_modules && yarn install --prod

ENTRYPOINT [ "node", "build" ]