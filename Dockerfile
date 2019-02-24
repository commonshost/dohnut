
ARG ARCH=amd64

FROM alpine as qemu

RUN apk add --no-cache curl

RUN curl -fsSL https://github.com/multiarch/qemu-user-static/releases/download/v3.1.0-2/qemu-arm-static -O \
	&& chmod +x qemu-arm-static

RUN curl -fsSL https://github.com/multiarch/qemu-user-static/releases/download/v3.1.0-2/qemu-aarch64-static -O \
	&& chmod +x qemu-aarch64-static

# ----------------------------------------------------------------------------

FROM ${ARCH}/node:11

COPY --from=qemu qemu-arm-static qemu-aarch64-static /usr/bin/

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get install -yq --no-install-recommends \
	git \
	curl \
	libsystemd-dev \
	build-essential \
	libssl-dev \
	net-tools \
	ldnsutils \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

COPY package.json ./
COPY source/ ./source

RUN npm install --production

RUN ln -s /app/source/bin.js /usr/local/bin/dohnut

ARG BUILD_DATE
ARG BUILD_VERSION
ARG VCS_REF

LABEL maintainer="kylemharding@gmail.com"
LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.name="commonshost/dohnut"
LABEL org.label-schema.description="Dohnut is a DNS to DNS-over-HTTPS (DoH) proxy server"
LABEL org.label-schema.url="https://github.com/commonshost/dohnut"
LABEL org.label-schema.vcs-url="https://github.com/commonshost/dohnut"
LABEL org.label-schema.docker.cmd="docker run -p 53:5300/tcp -p 53:5300/udp commonshost/dohnut"
LABEL org.label-schema.build-date="${BUILD_DATE}"
LABEL org.label-schema.version="${BUILD_VERSION}"
LABEL org.label-schema.vcs-ref="${VCS_REF}"

ENTRYPOINT [ "dohnut" ]
