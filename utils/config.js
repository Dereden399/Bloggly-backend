require("dotenv").config()

let PORT = process.env.PORT || 3001
let MONGODB_URI =
  process.env.NODE_ENV == "test"
    ? process.env.MONGODB_URI_TEST
    : process.env.MONGODB_URI

module.exports = {
  PORT,
  MONGODB_URI,
}
