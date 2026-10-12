# AI Financial Assistant Project Context

## Project Overview
This project is a backend REST API for an AI-powered Financial Assistant. The agent can answer user queries regarding cryptocurrency and stock prices by utilizing LLM Function Calling (Tool Use) to fetch real-time data from external APIs.

## Tech Stack
- **Language:** TypeScript
- **Framework:** Node.js with Express.js
- **Database:** PostgreSQL (with Prisma ORM) and Redis (for caching)
- **AI Integration:** Gemini API / OpenAI API (focus on Function Calling)

## Coding Standards & Conventions
1. **Strict TypeScript:** 
   - Never use `any`. Always define proper `interface` or `type`.
   - Enable `strict: true` in `tsconfig.json`.
2. **Asynchronous Programming:**
   - Always use `async/await`. Do not use `.then().catch()`.
   - Wrap route handlers in a `try/catch` block or use a centralized error handling middleware.
3. **Architecture (Controller-Service Pattern):**
   - `src/routes/`: Define API endpoints.
   - `src/controllers/`: Handle HTTP requests and responses.
   - `src/services/`: Contain core business logic (e.g., calling external APIs, LLM logic).
   - `src/config/`: Configuration files (environment variables, DB connection).
   - `src/types/`: TypeScript interface definitions.
4. **Clean Code:**
   - Variables and functions must be in `camelCase`.
   - Classes and interfaces must be in `PascalCase`.
   - Add JSDoc comments for complex business logic functions.

## Preferred AI Agent Patterns
- When implementing the LLM logic, focus on the **ReAct (Reasoning and Acting)** pattern.
- Clearly separate the API schema definition (for the LLM tool) from the actual function execution.

## Common Commands
- Development: `npm run dev` (using ts-node-dev or nodemon)
- Build: `npm run build` (tsc)
- Start: `npm start` (node dist/index.js)