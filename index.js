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

const GOOGLE_CLIENT_ID =
  "589100687475-a5os5k6fob930dm7ns7fvmar32p71qrp.apps.googleusercontent.com";
const GITHUB_CLIENT_ID = "e770e6440fbaac8200a7";

const { OAuth2Client } = require("google-auth-library");
const e = require("express");
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const DEFUALT_PICTURE = "..asdalksjdm";

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie_parser());

app.get("/", (request, response) => {
  check_session(request.cookies).then(
    (suc) => {
      response.sendFile(path.resolve(__dirname, "public/", "list.html"));
    },
    (rej) => {
      response.sendFile(path.resolve(__dirname, "public/", "sign-in.html"));
    }
  );
});

app.get("/queu_table", (request, response) => {
  check_session(request.cookies)
    .then(
      (suc) => {
        db.all(
          "SELECT id, user_id, note, submited, status FROM jobs WHERE status not in ('cancel','done') ORDER BY id LIMIT ? OFFSET ?",
          [parseInt(request.query.length), parseInt(request.query.start)],
          (err, rows_data) => {
            if (err) throw "Was not able to select DB";

            db.get(
              "SELECT count(*) cnt FROM jobs WHERE status not in ('cancel','done') ORDER BY id",
              [],
              (err, rows_count) => {
                // count(*)
                var out_data = [];

                rows_data.forEach((el) => {
                  var tmp_obj = {};

                  request.query.columns.forEach((in_el) => {
                    tmp_obj[in_el.data] = el[in_el.data];
                  });

                  out_data.push(tmp_obj);
                });

                response.send(
                  JSON.stringify({
                    draw: request.query.draw,
                    recordsTotal: rows_count.cnt,
                    recordsFiltered: rows_count.cnt,
                    data: out_data,
                  })
                );
              }
            );
          }
        );
      },
      (rej) => {
        throw "User not in authorized";
      }
    )
    .catch((e) => {
      response.send(JSON.stringify({ success: false }));
    });
});

app.get("/tokensignin", (request, response) => {
  if ("inst_redir" in request.query) {
    // response.status(302).redirect(request.query.inst_redir.substring());
    return;
  }

  if (request.query.in_type == "google") {
    auth_google(request, response);
  } else {
    console.log(request.originalUrl);
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

function set_session_id(sub) {
  var random_str = uuid.v4();
  console.log("Adding new session with random string: ", random_str);

  db.run(
    "INSERT INTO sessions(session_id, user_id) VALUES(?, (SELECT id FROM users WHERE ext_id = ?))",
    [random_str, sub]
  );

  return random_str;
}

// Returns promise, if rejected - then cookie list does not contain active session, resolved - active session was found
function check_session(cookies) {
  var ret_val;
  if ("session" in cookies) {
    ret_val = new Promise((resolve, reject) => {
      db.get(
        "SELECT count(*) cnt from sessions where session_id = ?",
        [cookies["session"]],
        (err, row) => {
          if (err || row.cnt == 0) reject(false);
          resolve(true);
        }
      );
    });
  } else
    ret_val = new Promise((resolve, reject) => {
      reject(false);
    });

  return ret_val;
}

function auth_google(request, response) {
  client
    .verifyIdToken({
      idToken: request.query.id_token,
      audience: GOOGLE_CLIENT_ID,
    })
    .then(async (ticket) => {
      const payload = ticket.getPayload();

      // Invalid AUD field
      if (payload.aud != GOOGLE_CLIENT_ID) throw "Invalid AUD!";
      console.log(payload);
      check_session(request.cookies).then(
        (suc) => {
          response
            .cookie("session", request.cookies["session"], {
              expires: new Date(Date.now() + 900000),
              httpOnly: true,
            })
            .status(200)
            .send("Login succesfully!");
        },
        (rej) => {
          db.get(
            "SELECT count(*) cnt FROM USERS WHERE users.ext_id = ? AND users.type = ?",
            [payload.sub, "google"],
            (err, row) => {
              if (err) throw "Was not able to check if users exists";

              if (row.cnt == 0) {
                db.run(
                  "INSERT INTO users(id, username, type, ext_id, avatar) VALUES((SELECT IFNULL(MAX(id), 0) + 1 FROM users), ?, ?, ?, ?)",
                  [
                    hidden_email(payload),
                    "google",
                    payload.sub,
                    "picture" in payload ? payload.picture : DEFUALT_PICTURE,
                  ]
                );
              } else {
                db.run(
                  "UPDATE users SET avatar = ? WHERE users.ext_id = ? AND users.type = ?",
                  [
                    "picture" in payload ? payload.picture : DEFUALT_PICTURE,
                    payload.sub,
                    "google",
                  ]
                );
              }

              response
                .cookie("session", set_session_id(payload.sub), {
                  expires: new Date(Date.now() + 900000),
                  httpOnly: true,
                })
                .status(200)
                .send("Login succesfully!");
            }
          );
        }
      );
    })
    .catch((e) => {
      response.status(401).send("Was unable to login with Google :(");
    });
}

function auth_github(requests) {}

function hidden_email(payload) {
  if ("email" in payload) return payload.email;
  else return "no_email@asd.com";
}
