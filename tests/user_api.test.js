const app = require("../app")
const bcrypt = require("bcrypt")
const User = require("../mongo_models/User")
const mongoose = require("mongoose")
const helper = require("./test_helper")
const supertest = require("supertest")

const api = supertest(app)

describe("initially one user", () => {
  beforeEach(async () => {
    await api.post("/test/reset")
    const passwordHash = await bcrypt.hash("admin", 10)
    const user = new User({ username: "admin", passwordHash })
    await user.save()
  })

  test("creation succeeds with a fresh username", async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: "Dereden",
      password: "qwerty12340",
    }

    await api
      .post("/api/users")
      .send(newUser)
      .expect(201)
      .expect("Content-Type", /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)
    const usernames = usersAtEnd.map(u => u.username)
    expect(usernames).toContain(newUser.username)
  })

  test("creation fails if username is already taken", async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: "admin",
      password: "qwerty12340",
    }
    const result = await api
      .post("/api/users")
      .send(newUser)
      .expect(400)
      .expect("Content-Type", /application\/json/)

    expect(result.body.error).toContain("`username` to be unique")

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test("fails if there is no username", async () => {
    const usersAtStart = await helper.usersInDb()
    const newUser = {
      password: "qwerty12340",
    }
    await api
      .post("/api/users")
      .send(newUser)
      .expect(400)
      .expect("Content-Type", /application\/json/)
    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test("fails if there is no password", async () => {
    const usersAtStart = await helper.usersInDb()
    const newUser = {
      username: "aboba",
    }
    await api
      .post("/api/users")
      .send(newUser)
      .expect(400)
      .expect("Content-Type", /application\/json/)
    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test("fails if password or username have less then 5 letters", async () => {
    const usersAtStart = await helper.usersInDb()
    const newUser = {
      username: "ro",
      name: "SU",
      password: "qw",
    }
    await api
      .post("/api/users")
      .send(newUser)
      .expect(400)
      .expect("Content-Type", /application\/json/)
    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })
})

afterAll(() => {
  mongoose.connection.close()
})
