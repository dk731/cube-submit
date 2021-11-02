const express = require("express");
const sqlite3 = require("sqlite3");
var path = require("path");
const cookie_parser = require("cookie-parser");
const uuid = require("uuid");

var db = new sqlite3.Database("users_data.db", (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Connected to the in-memory SQlite database.");
});

const CLIENT_ID =
  "589100687475-a5os5k6fob930dm7ns7fvmar32p71qrp.apps.googleusercontent.com";

const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(CLIENT_ID);

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie_parser());

app.get("/", (req, res) => {
  if ("session" in req.cookies) {
    db.get(
      "SELECT count(*) cnt from session where session_id=?",
      [request.cookies["session"]],
      (err, row) => {
        if (err) throw "Was not able to querry DB";

        if (row.cnt > 0)
          res.sendFile(
            path.resolve(__dirname, "public/", "kakoj-to drugoj dajl")
          );
        else res.sendFile(path.resolve(__dirname, "public/", "sign-in.html"));
      }
    );
  } else {
    res.sendFile(path.resolve(__dirname, "public/", "sign-in.html"));
  }
});

app.post("/tokensignin", (request, response) => {
  client
    .verifyIdToken({
      idToken: request.body.id_token,
      audience: CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    })
    .then(async (ticket) => {
      const payload = ticket.getPayload();
      // Invalid AUD field
      if (payload.aud != CLIENT_ID) throw "Invalid AUD!";

      // console.log(ticket.getPayload()); // ticket.getPayload() - userid
      var random_str;

      if ("session" in request.cookies) {
        db.get(
          "SELECT count(*) cnt from session where session_id=?",
          [request.cookies["session"]],
          (err, row) => {
            if (err) throw "Was not able to querry DB";

            if (row.cnt > 0) random_str = request.cookies["session"];
            else random_str = set_session_id(payload.sub);

            response
              .cookie("session", random_str, {
                expires: new Date(Date.now() + 900000),
                httpOnly: true,
              })
              .status(200)
              .send("Login succesfully!");
          }
        );
      } else {
        random_str = set_session_id(payload.sub);

        response
          .cookie("session", random_str, {
            expires: new Date(Date.now() + 900000),
            httpOnly: true,
          })
          .status(200)
          .send("Login succesfully!");
      }
    })
    .catch((e) => {
      response.status(401).send("Was unable to login with Google :(");
    });
});

// app.get("/sign-in", (req, res) => {
//   res.send("Hello World!");
// });

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

function set_session_id(sub) {
  var random_str = uuid.v4();
  console.log("Adding new session with random string: ", random_str);

  db.run("INSERT INTO session(session_id, user_id) VALUES(?, ?)", [
    random_str,
    sub,
  ]);

  return random_str;
}
