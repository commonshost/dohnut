# Dohnut with Docker

Use Docker to run Dohnut in a container. Multi-arch Docker container images are provided for: ARMv6, ARMv7, ARMv8, and x86-64 (Intel/AMD).

Docker image: [`commonshost/dohnut`](https://hub.docker.com/r/commonshost/dohnut)

    $ docker run [DOCKER_OPTIONS] commonshost/dohnut [DOHNUT_OPTIONS]

Any options before the image name `commonshost/dohnut` are for Docker. Any options after the image name are for Dohnut.

## Example

Proxy to Commons Host DoH and expose the DNS service on port `53` (UDP) on all network interfaces.

    $ docker run -p 0.0.0.0:53:53/udp commonshost/dohnut --listen 0.0.0.0 --doh commonshost

Test the service by performing a DNS query on the Docker host system.

    $ dig @localhost example.com

    ; <<>> DiG 9.10.6 <<>> @127.0.0.1 example.com
    ; (1 server found)
    ;; global options: +cmd
    ;; Got answer:
    ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 32488
    ;; flags: qr rd ra ad; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

    ;; OPT PSEUDOSECTION:
    ; EDNS: version: 0, flags:; udp: 4096
    ;; QUESTION SECTION:
    ;example.com.			IN	A

    ;; ANSWER SECTION:
    example.com.		86236	IN	A	93.184.216.34

    ;; Query time: 13 msec
    ;; SERVER: 127.0.0.1#53(127.0.0.1)
    ;; WHEN: Tue Feb 19 15:44:53 +08 2019
    ;; MSG SIZE  rcvd: 56

## Dohnut Options

See the [command line interface](../cli) reference.

## Docker Options

See the [Docker reference documentation](https://docs.docker.com/engine/reference/run/) for `docker run`.

## Background Service Daemon

Using the `--detach` or `-d` Docker option to run Dohnut as a background service, aka *daemon*.

The `--restart unless-stopped` Docker option automatically runs Dohnut when Docker starts (i.e. at system boot), and restart the process if it crashes.

## Networking

Dohnut run inside a container so Docker needs to map its listening ports to the host's network.

Service using IPv4:

    $ docker run --detach --restart unless-stopped --publish 0.0.0.0:53:53/udp commonshost/dohnut --listen 0.0.0.0:53 --doh commonshost

Service using IPv6:

    $ docker run --detach --restart unless-stopped --publish [::]:53:53/udp commonshost/dohnut --listen [::]:53 --doh commonshost

Please ensure that Dohnut is only exposed to a private LAN or localhost. Running a public, open DNS resolver exposed to public Internet traffic is strongly discouraged. Plaintext DNS/UDP is a potential source of [traffic amplification in DDoS attacks](https://en.wikipedia.org/wiki/Denial-of-service_attack#Amplification).

Expose Dohnut on `127.0.0.1` or `0.0.0.0` for localhost-only or all network interfaces respectively.

DNS uses port `53` by default but one use case of re-mapping to another port is when Dohnut is used as a local proxy for another resolver like `resolved` or [Pi-hole](../pihole). For example to run Dohnut on port `53000` and only be accessible from the local host:

    $ docker run --detach --restart unless-stopped --publish 127.0.0.1:53000:53/udp commonshost/dohnut --listen 0.0.0.0:53 --doh commonshost
