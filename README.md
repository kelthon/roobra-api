# PH API

- Node.js 24 (see `Dockerfile` for the exact pinned version)
- [NestJS](https://nestjs.com/)
- PostgreSQL via [Prisma](https://www.prisma.io/)
- Redis, BullMQ — planned, not yet wired into the codebase
- Docker / Docker Compose

This project is a RESTful API built using the [NestJS framework](https://github.com/nestjs/nest). It provides endpoints for managing and retrieving data related to a specific domain. The API is designed to be scalable, maintainable, and easy to use, following best practices in software development.

- Docker with the Compose plugin
- Node.js 24+ and npm — only needed if running outside Docker

First of all you need to clone the repository and navigate to the project directory:

```bash
# Clone repository
git clone git@github.com:Kelthon/ph-api.git

# Change to project directory
cd ph-api
```

Then, install the dependencies:

```bash
npm install
```

Copy environment variables:

```bash
cp .env.example .env
```

Now you can edit the `.env` file to set up your environment variables, such as database connection strings, API keys, and other configuration settings.

## Compile and run the project

### Running the app with npm

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

### Running the app with Docker

Make sure you have Docker installed and running on your machine. Then, you can build and run the Docker container using the following commands:

```bash
# Build the Docker image
docker build -t ph-api .

# Run the Docker container
docker run -p 3000:3000 ph-api
```

   Fill in at least `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_URL`
   (`DATABASE_HOST` should be `db`, the Compose service name). Do not leave `DATABASE_USER` empty
   on the first run — see [docs/docker.md](docs/docker.md#postgres_user--database_user) for why.

To run the tests for this project, you can use the following commands:

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Linting and formatting

To maintain code quality and consistency, you can use the following commands for linting and formatting:

```bash
# Lint the code
npm run lint
```

## Deployment

Production runs the same containers via `compose.prod.yaml` and `scripts/deploy.sh`. See
[docs/deployment.md](docs/deployment.md) for the full process, prerequisites, the current CI
pipeline status, and how to recover a misconfigured database role without losing data.

## License

This project is a property of [Kelthon](https://github.com/Kelthon). All rights reserved. Unauthorized use, reproduction, or distribution of this code is strictly prohibited. For inquiries or permissions, please contact the owner directly.
