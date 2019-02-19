# Dohnut and Pi-hole

[Pi-hole](https://pi-hole.net) is an effective way to block ads across all devices on a network. It provides many powerful options and is easy to deploy and manage.

Dohnut works with Pi-hole as a local upstream DNS server. Dohnut encrypts outbound DNS queries and can load-balance between multiple DoH providers for performance and privacy benefits. Additional countermeasures supported by Dohnut can be enabled to deter tracking even by DoH providers.

## Deploy Dohnut

Dohnut can run on the same device as Pi-hole. A popular approach is to [set up Raspbian Linux on a Raspberry Pi](../raspbian).

[Run Dohnut in Docker](../docker) or [run Dohnut with systemd](../systemd).

## Configure Dohnut

Pi-hole exposes a DNS server on port `53/udp`. Dohnut can avoid conflict by running on a different port, for example `53000`.

The only DNS "client" talking directly to Dohnut will be Pi-hole. If both are deployed on the same machine, Dohnut can be restricted to allow only on local connections by listening on a loopback interface `127.0.0.1`.

    --listen 127.0.0.1:53000

Specify any other [command line interface options](../cli) as needed. These options can be passed to the `dohnut` command directly, via a JSON file (e.g. `--options dohnut.json`), or as arguments to the Docker image using `docker run`.

For example:

    $ dohnut \
      --listen 127.0.0.1:53000 \
      --doh cleanbrowsing cloudflare commonshost quad9 \
      --countermeasures spoof-queries spoof-useragent

## Deploy Pi-hole

See the [Pi-hole documentation](https://docs.pi-hole.net) for installation instructions.

## Configure Pi-hole

Access the Pi-hole dashboard and log in as administrator.

https://pi.hole/admin (or the Pi-hole's IP address)

Go to: **Settings** > **DNS** > **Upstream DNS Servers** > **Custom 1 (IPv4)**

Enter the Dohnut IP address and port using the hash syntax (`address#port`). Enable its checkbox.

    127.0.0.1#53000

Disable any other Upstream DNS servers to ensure all DNS queries make use of Dohnut.

## Done

All your DNS queries through Pi-hole are now encrypted and load balanced for enhanced security, privacy, and performance.
