FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ✅ Build-time args (Next.js public env)
ARG NEXT_PUBLIC_BLOCKSCOUT_URL
ARG NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS
ARG NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS_OLD
ARG NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS_OLD1
ARG NEXT_PUBLIC_DEX_TARGET
ARG NEXT_PUBLIC_DOMAIN
ARG NEXT_PUBLIC_WS_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_USE_MOCK

ENV NODE_ENV=production \
  NEXT_PUBLIC_BLOCKSCOUT_URL=$NEXT_PUBLIC_BLOCKSCOUT_URL \
  NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS=$NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS \
  NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS_OLD=$NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS_OLD \
  NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS_OLD1=$NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS_OLD1 \
  NEXT_PUBLIC_DEX_TARGET=$NEXT_PUBLIC_DEX_TARGET \
  NEXT_PUBLIC_DOMAIN=$NEXT_PUBLIC_DOMAIN \
  NEXT_PUBLIC_WS_BASE_URL=$NEXT_PUBLIC_WS_BASE_URL \
  NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
  NEXT_PUBLIC_USE_MOCK=$NEXT_PUBLIC_USE_MOCK
  
RUN yarn build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["yarn", "start"]