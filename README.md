# PH API

## Description

This project is a RESTful API built using the [NestJS framework](https://github.com/nestjs/nest). It provides endpoints for managing and retrieving data related to a specific domain. The API is designed to be scalable, maintainable, and easy to use, following best practices in software development.

## Project setup

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

## Run tests

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

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

## License

This project is a property of [Kelthon](https://github.com/Kelthon). All rights reserved. Unauthorized use, reproduction, or distribution of this code is strictly prohibited. For inquiries or permissions, please contact the owner directly.
