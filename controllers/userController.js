const userRouter = require("express").Router()
const bcrypt = require("bcrypt")
const User = require("../mongo_models/User")

userRouter.post("/", async (req, res) => {
  const body = req.body
  if (
    !body.password ||
    !body.username ||
    body.password.length < 5 ||
    body.username.length < 5
  ) {
    res
      .status(400)
      .json({ error: "username or password must be at least 5 letters long" })
  } else {
    const passwordHash = await bcrypt.hash(body.password, 10)
    const user = new User({
      username: body.username,
      passwordHash: passwordHash,
    })

    const savedUser = await user.save()
    res.status(201).json(savedUser)
  }
})

userRouter.get("/", async (req, res) => {
  const users = await User.find({}).populate("blogs", {
    title: 1,
    url: 1,
    author: 1,
    id: 1,
  })
  res.status(200).json(users.map(u => u.toJSON()))
})

userRouter.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id).populate("blogs", {
    title: 1,
    url: 1,
    author: 1,
    id: 1,
  })
  if (!user) {
    res.status(404).end()
  } else {
    res.status(200).json(user.toJSON())
  }
})

module.exports = userRouter
