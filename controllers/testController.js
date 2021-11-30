const testRouter = require("express").Router()
const User = require("../mongo_models/User")
const Blog = require("../mongo_models/Blog")

testRouter.post("/reset", async (req, res) => {
  await User.deleteMany({})
  await Blog.deleteMany({})

  res.status(204).end()
})

module.exports = testRouter
