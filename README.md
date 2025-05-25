# Streamflow airdrop app

## Description

This React app displays all airdrops available in Streamflow's staging environment. Users can search for airdrops by Airdrop ID (distributor public key), view details for each one, and, if eligible, check their token allocation and claim tokens.

The app queries token prices in USD using the Pyth Network, with Jupiter Aggregator as a fallback.

## Prerequisites

This project requires [yarn](https://yarnpkg.com/getting-started/install) package manager to run.

## Instructions for running:

1. To make sure you use the node version specified in the `.nvmrc` file and avoid inconsistencies run the following command:

```sh
nvm use
```

2. Install the dependencies

```sh
yarn
```

3. Run the project

```sh
yarn dev
```
