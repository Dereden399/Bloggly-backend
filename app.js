const express = require("express")
const app = express()

require("express-async-errors")
const mongoose = require("mongoose")
const logger = require("./utils/logger")
const config = require("./utils/config")
const middlewares = require("./utils/middlewares")

const blogsRouter = require("./controllers/blogsController")
const userRouter = require("./controllers/userController")
const loginRouter = require("./controllers/loginController")

logger.info("connecting to", config.MONGODB_URI)
mongoose
  .connect(config.MONGODB_URI)
  .then(() => logger.info("connected to MongoDB"))
  .catch(error => logger.error("error connecting to MongoDB:", error.message))

app.use(express.json())
app.use(middlewares.tokenExtractor)

app.use("/api/blogs", middlewares.AuthentificationCheck, blogsRouter)
app.use("/api/users", userRouter)
app.use("/api/login", loginRouter)
if (process.env.NODE_ENV === "test") {
  const testRouter = require("./controllers/testController")
  app.use("/test", testRouter)
}
app.use(express.static("build"))
app.get("*", function (req, res) {
  res.sendFile("index.html", { root: "./build" })
})
app.use(middlewares.unknownEndpoint)
app.use(middlewares.errorHandler)

module.exports = app
