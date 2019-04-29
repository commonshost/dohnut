ARG ARCH=amd64

FROM alpine:3.9.2 as qemu

RUN apk add --no-cache curl

ARG QEMU_VERSION=4.0.0

# https://github.com/hadolint/hadolint/wiki/DL4006
SHELL ["/bin/ash", "-o", "pipefail", "-c"]

RUN curl -fsSL https://github.com/multiarch/qemu-user-static/releases/download/v${QEMU_VERSION}/qemu-arm-static.tar.gz | tar zxvf - -C /usr/bin
RUN curl -fsSL https://github.com/multiarch/qemu-user-static/releases/download/v${QEMU_VERSION}/qemu-aarch64-static.tar.gz | tar zxvf - -C /usr/bin

RUN chmod +x /usr/bin/qemu-*

# ----------------------------------------------------------------------------

FROM ${ARCH}/node:12-alpine as build

# copy qemu binaries used for cross-compiling
COPY --from=qemu /usr/bin/qemu-* /usr/bin/

RUN apk add --no-cache \
	alpine-sdk \
	curl \
	drill \
	git \
	net-tools \	
	python

WORKDIR /app

COPY package.json ./
COPY source/ ./source

RUN yarn install --ignore-optional --production

# ----------------------------------------------------------------------------

FROM ${ARCH}/node:12-alpine

ARG BUILD_DATE
ARG BUILD_VERSION
ARG VCS_REF

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.name="commonshost/dohnut"
LABEL org.label-schema.description="Dohnut is a DNS to DNS-over-HTTPS (DoH) proxy server"
LABEL org.label-schema.url="https://help.commons.host/dohnut/"
LABEL org.label-schema.vcs-url="https://github.com/commonshost/dohnut"
LABEL org.label-schema.docker.cmd="docker run -p 53:53/tcp -p 53:53/udp commonshost/dohnut --listen 0.0.0.0:53 --doh commonshost"
LABEL org.label-schema.build-date="${BUILD_DATE}"
LABEL org.label-schema.version="${BUILD_VERSION}"
LABEL org.label-schema.vcs-ref="${VCS_REF}"

COPY --from=build /app /app

ENTRYPOINT [ "node", "/app/source/bin.js" ]
