const blogsRouter = require("express").Router()
const Blog = require("../mongo_models/Blog")
const User = require("../mongo_models/User")

blogsRouter.get("/", async (req, res) => {
  const blogs = await Blog.find({}).populate("user", {
    username: 1,
    id: 1,
  })
  res.status(200).json(blogs.map(x => x.toJSON()))
})

blogsRouter.get("/:id", async (req, res) => {
  const id = req.params.id
  const blog = await Blog.findById(id).populate("user", {
    username: 1,
    id: 1,
  })
  if (blog) {
    res.status(200).json(blog.toJSON())
  } else {
    res.status(404).end()
  }
})

blogsRouter.post("/", async (req, res) => {
  const body = req.body
  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: 0,
    user: req.tokenId,
  })
  const result = await blog.save()
  await result.populate("user", {
    username: 1,
    id: 1,
  })
  const user = await User.findById(req.tokenId)
  user.blogs = user.blogs.concat(result._id)
  await user.save({ validateModifiedOnly: true })

  res.status(201).json(result.toJSON())
})

blogsRouter.put("/:id", async (req, res) => {
  const body = req.body
  const findedBlog = await Blog.findById(req.params.id)
  if (!findedBlog) {
    return res.status(404).end()
  }
  if (
    findedBlog.user.toString() !== req.tokenId.toString() &&
    (body.title !== findedBlog.title ||
      body.author !== findedBlog.author ||
      body.url !== findedBlog.url)
  ) {
    return res.status(403).json({ error: "can not modify other users blog" })
  }
  findedBlog.title = body.title
  findedBlog.author = body.author
  findedBlog.url = body.url
  findedBlog.likes = body.likes
  findedBlog.comments = body.comments
  const updatedBlog = await findedBlog.save()
  res.status(200).json(updatedBlog.toJSON())
})

blogsRouter.delete("/:id", async (req, res) => {
  const findedBlog = await Blog.findById(req.params.id)
  if (!findedBlog) {
    return res.status(404).end()
  }
  if (findedBlog.user.toString() !== req.tokenId.toString()) {
    return res.status(403).json({ error: "Can not delete another user blog" })
  }
  await findedBlog.delete()
  const user = await User.findById(req.tokenId)
  user.blogs = user.blogs.filter(x => x.toString() !== req.params.id)
  await user.save({ validateModifiedOnly: true })
  res.status(204).end()
})

module.exports = blogsRouter
