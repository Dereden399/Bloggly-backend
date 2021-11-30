const jwt = require("jsonwebtoken")

const errorHandler = (error, req, res, next) => {
  if (error.name === "ValidationError") {
    res.status(400).json({ error: error.message })
  } else if (error.name === "CastError") {
    return res.status(400).send({ error: "malformatted id" })
  } else if (error.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "invalid token" })
  } else if (error.name === "TokenExpiredError") {
    return res.status(401).json({ error: "token expired" })
  }
  next(error)
}

const unknownEndpoint = (req, res) => {
  res.status(404).json({ error: "Unknown endpoint" })
}

const tokenExtractor = (req, res, next) => {
  const authorization = req.get("Authorization")
  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    req.token = authorization.substring(7)
  }
  next()
}

const AuthentificationCheck = (req, res, next) => {
  if (req.method.toLowerCase() !== "get") {
    const decodedToken = jwt.verify(req.token, process.env.SECRET)
    if (!req.token || !decodedToken.id) {
      return res.status(401).json({ error: "token missing or invalid" })
    }
    req.tokenId = decodedToken.id
  }
  next()
}

module.exports = {
  errorHandler,
  unknownEndpoint,
  tokenExtractor,
  AuthentificationCheck,
}
