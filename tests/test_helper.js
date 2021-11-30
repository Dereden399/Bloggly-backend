const Blog = require("../mongo_models/Blog")
const User = require("../mongo_models/User")

const initialBlogs = [
  {
    title: "The most boring blog",
    author: "Dmitry Kabachkov",
    url: "Nah",
    likes: 10,
  },
  {
    title: "The most interesting blog",
    author: "Dereden",
    url: "NahNah",
    likes: 99,
  },
]

const blogsInDb = async () => {
  const blogs = await Blog.find({})
  return blogs.map(blog => blog.toJSON())
}

const nonExistId = async () => {
  const newBlog = new Blog({
    title: "ToRemove",
    author: "System",
    url: "SomeUrl",
  })
  await newBlog.save()
  await newBlog.remove()
  return newBlog._id.toString()
}

const usersInDb = async () => {
  const users = await User.find({})
  return users.map(u => u.toJSON())
}

module.exports = {
  initialBlogs,
  blogsInDb,
  nonExistId,
  usersInDb,
}
