const { parse: parseQuery } = require("querystring");
const cookie_parser = require("cookie-parser");
const express = require("express");
const sqlite3 = require("sqlite3");
const axios = require("axios").default;
const uuid = require("uuid");
const path = require("path");
const fs = require("fs");

var db = new sqlite3.Database("users_data.db", (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Connected to the in-memory SQlite database.");
});

const GOOGLE_CLIENT_ID =
  "589100687475-a5os5k6fob930dm7ns7fvmar32p71qrp.apps.googleusercontent.com";
const GITHUB_CLIENT_ID = "e770e6440fbaac8200a7";
const GITHUB_CLIENT_SECRET = "2efd546aa39c3fbccc6eff4433aa8225ce4a7975";

const { OAuth2Client } = require("google-auth-library");
const e = require("express");
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const DEFUALT_PICTURE = "..asdalksjdm";

const app = express();
const port = 3000;

var ASIDE_HTML_FILE;
var LIST_HTML_FILE;

fs.readFile(
  path.resolve(__dirname, "templates/", "aside.html"),
  (err, data) => {
    if (err) throw err;

    ASIDE_HTML_FILE = data.toString("utf-8");
  }
);

fs.readFile(path.resolve(__dirname, "templates/", "list.html"), (err, data) => {
  if (err) throw err;

  LIST_HTML_FILE = data.toString("utf-8");
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie_parser());

app.get("/", (request, response) => {
  check_session(request.cookies)
    .then(
      (suc) => {
        var aside_atr = "{:MENU1:}";
        if ("menu" in request.query) {
          switch (request.query.menu) {
            case "main":
              aside_atr = "{:MENU1:}";
              break;
            case "my_jobs":
              aside_atr = "{:MENU2:}";
              break;
            case "leader":
              aside_atr = "{:MENU3:}";
              break;
          }
        }

        db.get(
          "SELECT avatar FROM users WHERE users.id = (SELECT user_id FROM sessions WHERE sessions.session_id = ?)",
          [request.cookies.session],
          (err, row) => {
            if (err) throw err;

            if (row) {
              response.send(
                LIST_HTML_FILE.replace(
                  new RegExp("{:AVATAR:}", "g"),
                  row.avatar
                ).replace(
                  "{:ASIDE:}",
                  ASIDE_HTML_FILE.replace(aside_atr, "here show").replace(
                    "{:MENU1:}|{:MENU2:}|{:MENU3:}",
                    ""
                  )
                )
              );
            } else {
              throw "ERORR";
            }
          }
        );
      },
      (rej) => {
        response.sendFile(path.resolve(__dirname, "public/", "sign-in.html"));
      }
    )
    .catch((e) => {
      response.status(500).send("ERROR");
    });
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

app.get("/signout", (request, response) => {
  db.run("DELETE from sessions WHERE sessions.session_id = ?", [
    request.cookies.session,
  ]);

  response
    .cookie("session", "", {
      expires: 0,
      httpOnly: true,
    })
    .status(200)
    .redirect("/");
});

app.get("/tokensignin", (request, response) => {
  if ("inst_redir" in request.query) {
    var redir_url = request.query.inst_redir;

    Object.entries(request.query).forEach(([k, v]) => {
      if (!["inst_redir", "rememb_value"].includes(k))
        redir_url += "&" + k + "=" + v;
    });

    response
      .status(302)
      .cookie("tmp_auth", request.query.rememb_value, {
        expires: new Date(Date.now() + 300000),
        httpOnly: true,
      })
      .redirect(redir_url);
    return;
  }

  check_session(request.cookies).then(
    (suc) => {
      response
        .cookie("session", request.cookies["session"], {
          expires: new Date(Date.now() + 900000),
          httpOnly: true,
        })
        .status(200)
        .redirect("/");
    },
    (rej) => {
      switch (request.query.in_type) {
        case "google":
          auth_google(request, response);
          break;
        case "facebook":
          auth_facebook(request, response);
          break;
        case "github":
        default:
          // If no querry type parrametrs was given, try to auth with github
          auth_github(request, response);
          break;
      }
    }
  );
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

      add_user(
        hidden_email(payload),
        payload.sub,
        "google",
        "picture" in payload ? payload.picture : DEFUALT_PICTURE,
        response
      );
    })
    .catch((e) => {
      response.status(401).send("Was unable to login with Google :(");
    });
}

function auth_github(request, response) {
  if (
    "tmp_auth" in request.cookies &&
    request.cookies.tmp_auth == request.query.state
  ) {
    axios
      .post(
        "https://github.com/login/oauth/access_token",
        {},
        {
          params: {
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code: request.query.code,
          },
        }
      )
      .then((res_token) => {
        const res_query = parseQuery(res_token.data);

        if (res_token.status != 200 || "error" in res_query)
          throw "Error during aqcuaring of github api token";

        axios
          .get("https://api.github.com/user", {
            headers: { Authorization: "token " + res_query.access_token },
          })
          .then((res_api) => {
            add_user(
              hidden_username(res_api.data),
              res_api.data.id,
              "github",
              "avatar_url" in res_api.data
                ? res_api.data.avatar_url
                : DEFUALT_PICTURE,
              response
            );
          });
      })
      .catch((err) => {
        response.status(401).send("Was not able to login with github :(123");
      });
  } else {
    response.status(401).send("Was not able to login with github :(");
  }
}

function add_user(username, ext_id, type, avatar, response) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT count(*) cnt FROM USERS WHERE users.ext_id = ? AND users.type = ?",
      [ext_id, type],
      (err, row) => {
        if (err) reject("Was not able to check if users exists");

        if (row.cnt == 0) {
          db.run(
            "INSERT INTO users(id, username, type, ext_id, avatar) VALUES((SELECT IFNULL(MAX(id), 0) + 1 FROM users), ?, ?, ?, ?)",
            [username, type, ext_id, avatar]
          );
        } else {
          db.run(
            "UPDATE users SET avatar = ? WHERE users.ext_id = ? AND users.type = ?",
            [avatar, ext_id, type]
          );
        }

        resolve("Added user");
      }
    );
  }).then((suc) => {
    response
      .cookie("session", set_session_id(ext_id), {
        expires: new Date(Date.now() + 900000),
        httpOnly: true,
      })
      .status(200)
      .redirect("/");
  });
}

function hidden_email(payload) {
  if ("email" in payload) return payload.email;
  else return "no_email@asd.com";
}

function hidden_username(querry) {
  if ("login" in querry) return querry.login;
  else return "anonymous";
}
