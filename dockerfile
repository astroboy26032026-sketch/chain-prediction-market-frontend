FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=development
RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["yarn", "start"]