const mongoose = require("mongoose")
const supertest = require("supertest")
const app = require("../app")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const helper = require("./test_helper")
const Blog = require("../mongo_models/Blog")
const User = require("../mongo_models/User")

const api = supertest(app)

const initUser = async data => {
  const passwordHash = await bcrypt.hash(data.password, 10)
  const user = new User({ username: data.username, passwordHash })
  const savedUser = await user.save()
  return savedUser
}

describe("initially few blogs saved", () => {
  let token = ""
  beforeEach(async () => {
    await api.post("/test/reset")
    const user = await initUser({ username: "admin", password: "admin" })
    token = jwt.sign(
      { username: "admin", id: user._id.toString() },
      process.env.SECRET,
      {
        expiresIn: 10,
      }
    )
    for (let blog of helper.initialBlogs) {
      const newBlogWithId = new Blog({
        title: blog.title,
        author: blog.author,
        url: blog.author,
        likes: blog.likes,
        user: user._id,
      })
      const savedBlog = await newBlogWithId.save()
      user.blogs = user.blogs.concat(savedBlog._id)
    }
    await user.save()
  })

  test("blogs are returned as json", async () => {
    await api
      .get("/api/blogs")
      .expect(200)
      .expect("Content-Type", /application\/json/)
  })

  test("all blogs are returned", async () => {
    const blogs = await api.get("/api/blogs")
    expect(blogs.body).toHaveLength(helper.initialBlogs.length)
  })

  test("a specific blog is in db", async () => {
    const returned = await api
      .get(`/api/blogs`)
      .expect(200)
      .expect("Content-Type", /application\/json/)
    const titles = returned.body.map(x => x.title)
    expect(titles).toContain("The most boring blog")
  })

  test("returned blogs have id but not _id", async () => {
    const returned = await api.get("/api/blogs")
    expect(returned.body[0].id).toBeDefined()
    expect(returned.body[0]._id).not.toBeDefined()
  })

  describe("viewing a specific blog", () => {
    test("valid id", async () => {
      const blogsAtStart = await helper.blogsInDb()
      const firstBlog = blogsAtStart[0]
      const returned = await api.get(`/api/blogs/${firstBlog.id}`).expect(200)
      expect(returned.body.title).toBe(firstBlog.title)
      expect(returned.body.user.id).toBe(firstBlog.user.toString())
    })

    test("invalid id", async () => {
      const id = "a"
      await api.get(`/api/blogs/${id}`).expect(400)
    })

    test("non exist id", async () => {
      const id = await helper.nonExistId()
      await api.get(`/api/blogs/${id}`).expect(404)
    })
  })

  describe("Adding a new blog", () => {
    test("normal add", async () => {
      const newBlog = {
        title: "Some blog",
        author: "System",
        url: "Blabla",
        likes: 0,
      }
      await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
        .expect(201)
        .expect("Content-Type", /application\/json/)
      const blogsAtEnd = await helper.blogsInDb()
      expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1)

      const contents = blogsAtEnd.map(n => n.title)
      expect(contents).toContainEqual("Some blog")

      const updatedUser = await User.findOne({ username: "admin" })
      const addedBlog = await Blog.findOne({
        title: "Some blog",
        author: "System",
      })
      expect(updatedUser.blogs).toContainEqual(addedBlog._id)
    })

    test("if there are not likes in blog to post", async () => {
      const newBlog = {
        title: "Some blog",
        author: "System",
        url: "Blabla",
      }
      await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
        .expect(201)

      const lastBlog = await Blog.findOne({ title: "Some blog" })
      expect(lastBlog.likes).toBe(0)
    })

    test("validation error in blog", async () => {
      const newBlog = {
        author: "System",
        url: "Blabla",
      }
      await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
        .expect(400)
    })

    test("unathorized user tries to add a blog", async () => {
      const newBlog = {
        title: "Some blog",
        author: "System",
        url: "Blabla",
        likes: 0,
      }
      await api.post("/api/blogs").send(newBlog).expect(401)
    })
  })
  describe("deleting a blog", () => {
    test("delete a valid blog", async () => {
      const newBlog = {
        title: "To delete",
        author: "System",
        url: "Blabla",
      }
      await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const blog = await Blog.findOne({ title: "To delete" })
      const id = blog._id.toString()
      await api
        .delete(`/api/blogs/${id}`)
        .set("Authorization", String("bearer " + token))
        .expect(204)
      const updatedUser = await User.findOne({ username: "admin" })
      expect(updatedUser.blogs).not.toContainEqual(id)
    })
    test("delete non existing id", async () => {
      const id = await helper.nonExistId()
      await api
        .delete(`/api/blogs/${id}`)
        .set("Authorization", String("bearer " + token))
        .expect(404)
    })
    test("delete a invalid id", async () => {
      const id = "a"
      await api
        .delete(`/api/blogs/${id}`)
        .set("Authorization", String("bearer " + token))
        .expect(400)
    })
    test("unathorized user tries to delete", async () => {
      const newBlog = {
        title: "To delete",
        author: "System",
        url: "Blabla",
      }
      await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const blog = await Blog.findOne({ title: "To delete" })
      const id = blog._id.toString()
      await api.delete(`/api/blogs/${id}`).expect(401)
    })
  })

  describe("modifying a blog", () => {
    test("normal valid modify", async () => {
      const newBlog = {
        title: "To modify",
        author: "System",
        url: "Blabla",
      }
      const blog = await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const toUpdate = {
        title: "HEHEHE",
        author: "Dereden",
        url: "ASDASD",
        likes: 0,
      }
      const updated = await api
        .put(`/api/blogs/${blog.body.id}`)
        .set("Authorization", String("bearer " + token))
        .send(toUpdate)
      expect(updated.body.author).toEqual("Dereden")
    })
    test("try to modify non exist id", async () => {
      const id = await helper.nonExistId()
      const toUpdate = {
        title: "HEHEHE",
        author: "Dereden",
        url: "ASDASD",
      }
      const updated = await api
        .put(`/api/blogs/${id}`)
        .set("Authorization", String("bearer " + token))
        .send(toUpdate)
        .expect(404)
    })
    test("try to modify invalid id", async () => {
      const id = "asd123asd"
      const toUpdate = {
        title: "HEHEHE",
        author: "Dereden",
        url: "ASDASD",
      }
      const updated = await api
        .put(`/api/blogs/${id}`)
        .set("Authorization", String("bearer " + token))
        .send(toUpdate)
        .expect(400)
    })
    test("unathorized user tries to modify", async () => {
      const newBlog = {
        title: "To modify",
        author: "System",
        url: "Blabla",
      }
      const blog = await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const toUpdate = {
        title: "HEHEHE",
        author: "Dereden",
        url: "ASDASD",
        likes: 0,
      }
      await api.put(`/api/blogs/${blog.body.id}`).send(toUpdate).expect(401)
    })
    test("like a blog", async () => {
      const newBlog = {
        title: "To modify",
        author: "System",
        url: "Blabla",
        likes: 0,
      }
      const blog = await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const toUpdate = { ...newBlog, likes: newBlog.likes + 1 }
      const updated = await api
        .put(`/api/blogs/${blog.body.id}`)
        .set("Authorization", String("bearer " + token))
        .send(toUpdate)
      expect(updated.body.likes).toBe(newBlog.likes + 1)
    })
    test("can comment", async () => {
      const newBlog = {
        title: "To modify",
        author: "System",
        url: "Blabla",
        likes: 0,
      }
      const blog = await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const toUpdate = { ...newBlog, comments: ["good"] }
      const updated = await api
        .put(`/api/blogs/${blog.body.id}`)
        .set("Authorization", String("bearer " + token))
        .send(toUpdate)
      expect(updated.body.comments).toContainEqual("good")
    })
  })
  describe("Second user do something", () => {
    let secondToken = ""
    beforeEach(async () => {
      const user = await initUser({ username: "second", password: "admin" })
      secondToken = jwt.sign(
        { username: "second", id: user._id.toString() },
        process.env.SECRET,
        {
          expiresIn: 10,
        }
      )
    })
    test("second user can like others posts", async () => {
      const newBlog = {
        title: "title",
        author: "author",
        url: "someUrl",
        likes: 0,
        comments: [],
      }
      const blog = await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const toUpdate = { ...newBlog, likes: newBlog.likes + 1 }
      const updated = await api
        .put(`/api/blogs/${blog.body.id}`)
        .set("Authorization", String("bearer " + secondToken))
        .send(toUpdate)
      expect(updated.body.likes).toBe(newBlog.likes + 1)
    })
    test("second user can comment", async () => {
      const newBlog = {
        title: "To modify",
        author: "System",
        url: "Blabla",
        likes: 0,
      }
      const blog = await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const toUpdate = { ...newBlog, comments: ["good"] }
      const updated = await api
        .put(`/api/blogs/${blog.body.id}`)
        .set("Authorization", String("bearer " + secondToken))
        .send(toUpdate)
      expect(updated.body.comments).toContainEqual("good")
    })
    test("second user cant modify others blogs", async () => {
      const newBlog = {
        title: "To modify",
        author: "System",
        url: "Blabla",
      }
      const blog = await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const toUpdate = {
        title: "HEHEHE",
        author: "Dereden",
        url: "ASDASD",
        likes: 0,
        comments: [],
      }
      await api
        .put(`/api/blogs/${blog.body.id}`)
        .set("Authorization", String("bearer " + secondToken))
        .send(toUpdate)
        .expect(403)
    })
    test("second user cant delete others blogs", async () => {
      const newBlog = {
        title: "To delete",
        author: "System",
        url: "Blabla",
      }
      await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const blog = await Blog.findOne({ title: "To delete" })
      const id = blog._id.toString()
      await api
        .delete(`/api/blogs/${id}`)
        .set("Authorization", String("bearer " + secondToken))
        .expect(403)
    })
    test("second user tries to modify and like at the same time", async () => {
      const newBlog = {
        title: "To modify",
        author: "System",
        url: "Blabla",
      }
      const blog = await api
        .post("/api/blogs")
        .set("Authorization", String("bearer " + token))
        .send(newBlog)
      const toUpdate = {
        title: "HEHEHE",
        author: "Dereden",
        url: "ASDASD",
        likes: 1,
        comments: [],
      }
      await api
        .put(`/api/blogs/${blog.body.id}`)
        .set("Authorization", String("bearer " + secondToken))
        .send(toUpdate)
        .expect(403)
    })
  })
})

afterAll(() => {
  mongoose.connection.close()
})
