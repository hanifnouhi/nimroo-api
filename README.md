# Nimroo API

Backend for the Nimroo flashcard project — a NestJS TypeScript API that helps users create and manage flashcards enriched with translations, spell-check, generated or found images, and language model analysis. Services are implemented modularly so you can swap providers (translation, image search/generation, storage, caching, etc.) as needed.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Table of contents
- [Summary](#summary)
- [Audience](#audience)
- [Features](#features)
- [Architecture & Modules](#architecture--modules)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Installation & running](#installation--running)
- [Spell-checker service (Python)](#spell-checker-service-python)
- [API (high-level)](#api-high-level)
- [Testing](#testing)
- [Development notes](#development-notes)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

Summary
Nimroo API is a modular backend for a flashcard application. Given a word or phrase, the system can:
- translate text (Azure Translation),
- check spelling (separate Python service in `spell-checker`),
- analyze the word and return definitions, examples and related information using Azure OpenAI,
- find relevant images via Unsplash,
- generate images with Stability AI,
- store media in Azure Blob Storage (optional),
- persist flashcards in MongoDB.

All services are designed as interchangeable modules so you can replace any provider with an alternative implementation.

Audience
This project is for anyone who uses flashcards to learn languages or teach concepts in their native language — learners, teachers, or developers building study tools.

Features
- Translation using Azure translation services.
- Spell checking via a Python microservice located in `spell-checker`.
- Word analysis, explanations, and examples using Azure OpenAI.
- Image search using Unsplash.
- Image generation using Stability AI.
- Caching to avoid duplicate calls and reduce latency.
- Optional Azure Blob Storage for media.
- MongoDB as the primary data store.
- Authentication and membership (JWT + Passport).
- Modular architecture enabling easy provider replacement.
- TDD approach with tests written using Jest.

Architecture & Modules
The main NestJS application lives in `nestjsApp/` and is organized by feature modules:
- auth — authentication, JWT handling, membership
- user — user management and profiles
- card — flashcard business logic
- translate — translation integrations
- spell-check — clients that call the Python spell-checker service
- llm — LLM/analyze connectors (Azure OpenAI)
- image — image search and generation adapters (Unsplash, Stability)
- storage — storage adapters (Azure Blob by default)
- cache — cache adapters (e.g., Redis)
- common — shared DTOs, pipes, guards, and utilities

Prerequisites
- Node.js (LTS, e.g., Node 18+)
- npm (or yarn)
- Docker (optional, recommended to run the Python spell-checker)
- MongoDB (remote or local)
- Optional: Redis (for cache), Azure services credentials, API keys for Unsplash and Stability

Environment variables
Configure variables in a `.env` file at project root or in `nestjsApp/` as required. The following variables are used by the project:

- NODE_ENV
- PORT
- DATABASE_URI
- JWT_ACCESS_TOKEN_SECRET
- JWT_ACCESS_TOKEN_EXPIRATION_MS
- JWT_REFRESH_TOKEN_SECRET
- JWT_REFRESH_TOKEN_EXPIRATION_MS
- IMAGE_SEARCH_PROVIDER
- UNSPLASH_IMAGE_SEARCH_URL
- UNSPLASH_IMAGE_SEARCH_APPLICATION_ID
- UNSPLASH_IMAGE_SEARCH_ACCESS_KEY
- UNSPLASH_IMAGE_SEARCH_SECRET_KEY
- LLM_ANALYZE_PROVIDER
- AZURE_OPEN_AI_ANALYZE_URL
- AZURE_OPEN_AI_ANALYZE_KEY1
- AZURE_OPEN_AI_ANALYZE_KEY2
- AZURE_OPEN_AI_ANALYZE_REGION
- AZURE_OPEN_AI_ANALYZE_DEPLOYMENT
- AZURE_OPEN_AI_ANALYZE_API_VERSION
- IMAGE_GENERATE_PROVIDER
- STABILITY_IMAGE_GENERATE_URL
- STABILITY_IMAGE_GENERATE_API_KEY
- STABILITY_IMAGE_GENERATE_MODEL
- STORAGE_PROVIDER
- AZURE_STORAGE_CONNECTION_STRING
- AZURE_STORAGE_IMAGE_CONTAINER_NAME
- EMAIL_SERVICE
- EMAIL_USER
- EMAIL_PASSWORD
- EMAIL_FROM_NAME
- EMAIL_VERIFICATION_URL
- RESET_PASSWORD_URL
- JWT_EMAIL_SECRET
- JWT_EMAIL_TOKEN_EXPIRATION_D
- JWT_RESET_PASSWORD_SECRET
- JWT_RESET_PASSWORD_TOKEN_EXPIRATION_MS
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_CALLBACK_URL
- AUTH_UI_REDIRECT
- DISABLE_MEMBERSHIP_SYSTEM
- INITIAL_ADMIN_EMAIL
- INITIAL_ADMIN_PASSWORD

Installation & running
1. Clone repository
   git clone https://github.com/hanifnouhi/nimroo-api.git
   cd nimroo-api

2. Install dependencies
   cd nestjsApp
   npm install

3. Configure environment
   Copy your environment example (if present) and edit:
   cp .env.example .env
   # edit .env and fill in keys, DB URIs, API keys, etc.

4. Run the application
   npm run start
   # Development (watch mode)
   npm run start:dev

Default server port (if not set): 3000 (check `.env`/code for exact default)

Spell-checker service (Python)
A spell-check microservice is provided in the `spell-checker` folder. It is implemented in Python and can be run with Docker. Example steps (adapt if the project uses a different Dockerfile/port):

1. Build the spell-checker image
   cd spell-checker
   docker build -t nimroo-spell-checker .

2. Run the container (example exposing port 5000)
   docker run -p 5000:5000 nimroo-spell-checker

3. Confirm the service is available (example)
   GET http://localhost:5000/health

You may replace this service with any other spell-check provider; the NestJS app calls it via HTTP.

API (high-level)
- The project provides an interactive Swagger UI. After starting the server, open the Swagger documentation in your browser:
  http://localhost:3000/api
- The Swagger UI lists all available endpoints, request/response schemas, and allows you to try requests directly from the browser.

Testing
- Unit tests: npm run test
- End-to-end tests: npm run test:e2e
- The project follows TDD; tests are written with Jest.

Development notes
- Follow the modular pattern when adding or replacing providers.
- Shared utilities and DTOs live in `src/common`.
- Keep secrets out of VCS; use environment variables or a secret manager in production.
- Caching is implemented to reduce external requests. Configure cache provider in `.env`.

Contributing
- Open an issue describing the change you want.
- Fork the repo and create a branch: git checkout -b feature/your-feature
- Run tests and linters locally before opening a pull request.
- Follow existing TypeScript + NestJS coding conventions.

License
This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

Contact
Author: Hanif Nouhi — https://github.com/hanifnouhi

Notes / TODO
- A Progressive Web App (PWA) frontend is in progress; documentation will be added here when available.
