# API

Programmatic use of Dohnut in JavaScript.

## Installation

```shell
$ npm install dohnut
```

## `new Dohnut(configuration)`

```js
const dohnut = new Dohnut(configuration)
```

The `configuration` object contains all options described in the [CLI](../cli) documentation. However the data structure is not identical to the `--options` file format. Notably the `dns` and `doh` arguments are broken down into explicit parameters.

```json
{
  "dns": [
    {
      "type": "udp4",
      "address": "0.0.0.0",
      "port": 53
    },
    {
      "type": "udp6",
      "address": "::",
      "port": 53
    }
  ],
  "doh": [
    { "uri": "https://commons.host" },
    { "uri": "https://doh.powerdns.org" }
  ],
  "bootstrap": [
    "1.1.1.1",
    "8.8.8.8",
    "9.9.9.9"
  ],
  "countermeasures": [
    "spoof-queries",
    "spoof-useragent"
  ],
  "load-balance": "privacy"
}
```

## `await dohnut.start()`

Returns a promise that resolves once the server is ready and listening on all DNS sockets.

Rejects with an error if anything goes wrong.

## `await dohnut.stop()`

Returns a promise that resolves after gracefully closing the server: all listening DNS sockets, and all outbound HTTP/2 connections.
