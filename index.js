const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get("/books/", async (req, res) => {
  const headerAuth = req.headers["authorization"];
  console.log(headerAuth);
  let token;
  if (headerAuth) {
    token = headerAuth.split(" ")[1];
  }
  if (token) {
    try {
      const decoder = jwt.verify(token, "ASSUME_RICH");
      console.log(decoder);
      const getBooksQuery = `
            SELECT
                *
            FROM
                book
            ORDER BY
                book_id;`;
      const booksArray = await db.all(getBooksQuery);
      res.send(booksArray);
    } catch (error) {
      res.status(401).send("Invalid Token");
    }

    // jwt.verify(token, "ASSUME_RICH", async (a, b) => {
    //   if (a) {
    //     res.status(401).send("Invalid Token");
    //   } else {
    // const getBooksQuery = `
    //     SELECT
    //         *
    //     FROM
    //         book
    //     ORDER BY
    //         book_id;`;
    // const booksArray = await db.all(getBooksQuery);
    // res.send(booksArray);
    //   }
    // });
  } else {
    res.status(401).send("Unauthorized User");
  }
});

// User Register API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// User Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = dbUser.username;
      const token = jwt.sign(payload, "ASSUME_RICH");
      response.status(200).send({ token });
      console.log(token);
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});
