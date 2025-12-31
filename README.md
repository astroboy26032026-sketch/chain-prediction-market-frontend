# Pump Clone

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Architecture Overview](#architecture-overview)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Dependencies](#dependencies)


## Getting Started

### Prerequisites

- Node.js (version 20 or later)
- Yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Quan359100/Pump_fun_clone.git
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

### Running the Application

1. Set up your environment variables (see [Environment Variables](#environment-variables) section).

2. Start the development server:
   ```bash
   yarn dev
   ```

3. Open your browser and navigate to `http://localhost:3000`.

## Architecture Overview

Built using the following technologies and frameworks:

- Next.js: React framework for server-side rendering and static site generation
- React: JavaScript library for building user interfaces
- Tailwind CSS: Utility-first CSS framework for styling
- Ethers.js: Library for interacting with Ethereum
- RainbowKit: Ethereum wallet connection library
- Wagmi: React hooks for EVM chains
- lightweight-charts: Charting libraries for data visualization

The application follows a component-based architecture, with reusable UI components and hooks for managing state and interactions with the blockchain.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_BLOCKSCOUT_URL=
NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS=
NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS_OLD=
NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS_OLD1=
NEXT_PUBLIC_DEX_TARGET=
NEXT_PUBLIC_DOMAIN=
NEXT_PUBLIC_WS_BASE_URL=
UPLOADTHING_TOKEN=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK=true
```
NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS_OLD & NEXT_PUBLIC_BONDING_CURVE_MANAGER_ADDRESS_OLD1 are for compatibility with old contracts