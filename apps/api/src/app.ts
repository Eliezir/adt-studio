import path from "node:path"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { errorHandler } from "./middleware/error-handler.js"
import { healthRoutes } from "./routes/health.js"
import { createBookRoutes } from "./routes/books.js"
import { createPipelineRoutes } from "./routes/pipeline.js"
import { createPageRoutes } from "./routes/pages.js"
import { createPipelineService } from "./services/pipeline-service.js"
import { createPipelineRunner } from "./services/pipeline-runner.js"

// Resolve paths relative to monorepo root (2 levels up from apps/api/)
const projectRoot = path.resolve(
  process.env.PROJECT_ROOT ?? path.join(process.cwd(), "../..")
)
const booksDir = path.resolve(process.env.BOOKS_DIR ?? path.join(projectRoot, "books"))
const promptsDir = path.resolve(process.env.PROMPTS_DIR ?? path.join(projectRoot, "prompts"))
const configPath = path.resolve(
  process.env.CONFIG_PATH ?? path.join(projectRoot, "config.yaml")
)

const pipelineRunner = createPipelineRunner()
const pipelineService = createPipelineService(pipelineRunner)

const app = new Hono()

app.use("*", logger())
app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
  })
)
app.onError(errorHandler)

app.route("/api", healthRoutes)
app.route("/api", createBookRoutes(booksDir))
app.route("/api", createPipelineRoutes(pipelineService, booksDir, promptsDir, configPath))
app.route("/api", createPageRoutes(booksDir))

export default app
