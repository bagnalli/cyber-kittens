const express = require("express");
const app = express();
const { User, Kitten } = require("./db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { users } = require("./db/seedData");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res, next) => {
  try {
    res.send(`
      <h1>Welcome to Cyber Kittens!</h1>
      <p>Cats are available at <a href="/kittens/1">/kittens/:id</a></p>
      <p>Create a new cat at <b><code>POST /kittens</code></b> and delete one at <b><code>DELETE /kittens/:id</code></b></p>
      <p>Log in via POST /login or register via POST /register</p>
    `);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// Verifies token with jwt.verify and sets req.user
// TODO - Create authentication middleware

app.use(async (req, res, next) => {
  const auth = req.header("Authorization");
  if (!auth) {
    next();
  } else {
    const [, token] = auth.split(" ");
    const userObj = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(userObj.id);
    req.user = user;
    next();
  }
});

// POST /register
// OPTIONAL - takes req.body of {username, password} and creates a new user with the hashed password

app.post("/register", async (req, res, next) => {
  const { username, password } = req.body;
  const hashedPW = await bcrypt.hash(password, 10);
  const { id, username: createdUsername } = await User.create({
    username,
    password: hashedPW,
  });
  const token = jwt.sign({ id, username }, JWT_SECRET);
  res.status(200).send({ message: "success", token });
});

// POST /login
// OPTIONAL - takes req.body of {username, password}, finds user by username, and compares the password with the hashed version from the DB

app.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({
      where: { username },
    });
    if (!user) {
      res.sendStatus(401);
      return;
    }
    const isAMatch = await bcrypt.compare(password, user.password);
    if (isAMatch) {
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET
      );
      res.send({ message: "success", token });
    } else {
      res.sendStatus(401);
    }
  } catch (error) {
    res.send(error);
  }
});

// GET /kittens/:id
// TODO - takes an id and returns the cat with that id
app.get("/kittens/:id", async (req, res, next) => {
  try {
    // Token
    const auth = req.headers.authorization;
    if (!auth) {
      res.sendStatus(401);
      return;
    }
    // Returns Kitten
    const kittenId = req.params.id;
    const kitten = await Kitten.findByPk(kittenId);

    // Is the kitten owned by user?
    if (user.id != kitten.ownerId) {
      res.sendStatus(401);
      return;
    }

    if (!kitten) {
      res.sendStatus(404);
      return;
    }

    const { age, color, name } = kitten;

    res.send({ age, color, name });
  } catch (error) {
    res.send(error);
  }
});

// POST /kittens
// TODO - takes req.body of {name, age, color} and creates a new cat with the given name, age, and color

app.post("/kittens", async (req, res, next) => {
  try {
    // Token
    const auth = req.headers.authorization;
    if (!auth) {
      res.sendStatus(401);
      return;
    }
    const { name, age, color } = req.body;
    const newKitten = await Kitten.create({
      name,
      age,
      color,
    });
    res.status(201).send({ name, age, color });
  } catch (error) {
    res.send(error);
  }
});

// DELETE /kittens/:id
// TODO - takes an id and deletes the cat with that id
app.delete("/kittens/:id", async (req, res) => {
  try {
    // Token
    const auth = req.headers.authorization;
    if (!auth) {
      res.sendStatus(401);
      return;
    }
    // Get kitten
    const kittenId = req.params.id;
    const kitten = await Kitten.findByPk(kittenId);

    if (!kitten) {
      res.sendStatus(404);
      return;
    }

    if (req.user.id !== kitten.ownerId) {
      res.sendStatus(401);
      return;
    }

    await Kitten.destroy({ where: { id: kittenId } });
    res.sendStatus(204);
  } catch (error) {
    res.send(error);
  }
});

// error handling middleware, so failed tests receive them
app.use((error, req, res, next) => {
  console.error("SERVER ERROR: ", error);
  if (res.statusCode < 400) res.status(500);
  res.send({ error: error.message, name: error.name, message: error.message });
});

// we export the app, not listening in here, so that we can run tests
module.exports = app;
