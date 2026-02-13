# Math Drawing & Guessing Game

Real-time multiplayer math-based drawing and guessing game built with
**Node.js**, **Socket.IO**, and a custom **Canvas Graph Engine** powered
by **Math.js**.

Players take turns drawing mathematical expressions on a coordinate
plane while others try to guess the hidden word.

------------------------------------------------------------------------

## Overview

This project combines:

-   Real-time WebSocket communication\
-   Multiplayer room management\
-   Server-authoritative game state\
-   Synchronized round timers\
-   Mathematical function rendering engine\
-   Role-based gameplay logic

It is designed as a foundation for a scalable math-based multiplayer
platform.

------------------------------------------------------------------------

## Architecture

### Backend

-   Node.js
-   Express
-   Socket.IO
-   Room-based state management using `Map`
-   Finite-state game flow:

```{=html}
<!-- -->
```
    LOBBY → ROUND → INTERMISSION → GAME_OVER

### Frontend

-   HTML5 Canvas
-   ES Modules
-   Socket.IO client
-   Math.js expression compilation

------------------------------------------------------------------------

## Project Structure

    .
    ├── server.js        # Express + Socket.IO server
    ├── index.html       # Room lobby UI
    ├── game.html        # Main game interface
    ├── engine.js        # Graph rendering engine

------------------------------------------------------------------------

## Features

### Multiplayer Room System

-   Public/private rooms
-   Max player limit
-   Automatic game start when ≥ 2 players
-   Live room status broadcasting

### Game Logic

-   Random painter selection per round
-   Score tracking
-   Automatic round rotation
-   Loopable drawing sets
-   Proper cleanup on disconnect

### Synchronized Timer System

-   Server stores `roundStartTime`
-   Clients calculate remaining time locally
-   No continuous polling required
-   Handles mid-round joins correctly

------------------------------------------------------------------------

## Graph Engine

Supports:

### Explicit Functions

    y = x^2
    y = sin(x)

### Implicit Functions

    x^2 + y^2 = 9
    x^2 - y^2 = 1

### Transformations

-   Translation (`dx`, `dy`)
-   Rotation (`θ`)
-   Custom domain (`xmin`, `xmax`)

Rendering optimizations: - Grid caching - Configurable sampling
resolution - Discontinuity detection - Anti-aliasing support

------------------------------------------------------------------------

## Installation

### 1. Clone

``` bash
git clone https://github.com/yourusername/math-drawing-game.git
cd math-drawing-game
```

### 2. Install dependencies

``` bash
npm install
```

### 3. Run

``` bash
node server.js
```

Server runs on:

    http://localhost:3000

------------------------------------------------------------------------

## How It Works

Each room maintains:

-   Users
-   Scores
-   Current painter
-   Round state
-   Active timers
-   Rendered graphs

Round flow:

1.  Select next painter
2.  Assign random word
3.  Start round timer
4.  Collect guesses
5.  End round on:
    -   Correct guess
    -   Timeout
6.  Short intermission
7.  Repeat until all players have drawn
