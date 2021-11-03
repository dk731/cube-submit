const { parse: parseQuery } = require("querystring");
const cookie_parser = require("cookie-parser");
const express = require("express");
const sqlite3 = require("sqlite3");
const axios = require("axios").default;
const uuid = require("uuid");
const path = require("path");
const fs = require("fs");

const STATUSES = {
  SUBMITED: {
    value: "submited",
    render:
      "<div class='row'><div class='col-12 d-flex justify-content-center text-center'><span class='badge badge-light-primary'>submited</span></div></div>",
  },
  VALIDATING: {
    value: "validating",
    render:
      "<div class='row'><div class='col-12 d-flex justify-content-center text-center'><span class='badge badge-light-dark'>validating</span></div></div>",
  },
  PENDING: {
    value: "pending",
    render:
      "<div class='row'><div class='col-12 d-flex justify-content-center text-center'><span class='badge badge-light-warning'>pending</span></div></div>",
  },
  RUNNING: {
    value: "running",
    render:
      "<div class='row'><div class='col-12 d-flex justify-content-center text-center'><span class='badge badge-light-info'>running</span></div></div>",
  },
  VOTING: {
    value: "voting",
    render:
      "<div class='row'><div class='col-12 d-flex justify-content-center text-center'><span class='badge badge-success'>voting</span></div></div>",
  },
  DONE: {
    value: "done",
    render:
      "<div class='row'><div class='col-12 d-flex justify-content-center text-center'><span class='badge badge-light-success'>done</span></div></div>",
  },
  CANCELED: {
    value: "canceled",
    render:
      "<div class='row'><div class='col-12 d-flex justify-content-center text-center'><span class='badge badge-light-danger'>canceled</span></div></div>",
  },
  ERROR: {
    value: "error",
    render:
      "<div class='row'><div class='col-12 d-flex justify-content-center text-center'><span class='badge badge-danger'>error</span></div></div>",
  },
};

const UNLIKABLE_STATUSES = [
  STATUSES.SUBMITED.value,
  STATUSES.VALIDATING.value,
  STATUSES.PENDING.value,
  STATUSES.CANCELED.value,
  STATUSES.ERROR.value,
];

const RES_SUCCESS = JSON.stringify({ success: true });
const RES_FAIL = JSON.stringify({ success: true });

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
      (cur_sess) => {
        const cur_params = JSON.parse(cur_sess.params);

        if (object_empty(request.query)) {
          var aside_atr = "{:MENU1:}";

          switch (cur_params.active_page) {
            case "main":
              aside_atr = "{:MENU1:}";
              break;
            case "my_jobs":
              aside_atr = "{:MENU2:}";
              break;
            case "leader":
              aside_atr = "{:MENU3:}";
              break;
            default:
              response.status(301).redirect("/?menu=main"); // If not active page was found, redirect to main page
              return;
          }

          db.get(
            "SELECT avatar FROM users WHERE users.id = (SELECT user_id FROM sessions WHERE sessions.session_id = ?)",
            [request.cookies.session],
            (err, row) => {
              if (err) throw err;

              if (row) {
                response
                  .status(200)
                  .send(
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
        } else {
          cur_params["active_page"] = request.query.menu;
          db.run(
            "UPDATE sessions SET params = ? WHERE sessions.session_id = ?",
            [JSON.stringify(cur_params), request.cookies.session],
            (err) => {
              if (err) throw "Was not able to set session active page";
              response.status(301).redirect("/");
            }
          );
        }
      },
      (rej) => {
        response.sendFile(path.resolve(__dirname, "public/", "sign-in.html"));
      }
    )
    .catch((e) => {
      response.status(500).send(e);
    });
});

app.get("/query_table", (request, response) => {
  check_session(request.cookies)
    .then(
      (cur_sess) => {
        const cur_params = JSON.parse(cur_sess.params);

        const sql_cur_usr_likes =
          "(SELECT count(*) FROM likes WHERE likes.job_id = jobs.id AND likes.user_id = $usr_id)";
        const sql_user_req =
          "(SELECT users.username FROM users WHERE users.id = jobs.user_id)";

        const sql_fields_main = `SELECT jobs.id, ${sql_user_req} username, jobs.user_id, jobs.note, jobs.submited, jobs.status, jobs.likes, ${sql_cur_usr_likes} usr_like FROM jobs WHERE `;
        const sql_count_main = "SELECT count(*) cnt FROM jobs WHERE ";

        const sql_filter_list = [];
        var sql_order = " ORDER BY jobs.id";
        const sql_offset_lim = " LIMIT $req_len OFFSET $req_start";

        const sql_main_obj = { $usr_id: cur_sess.user_id };

        const sql_filter_obj = {};

        const sql_order_obj = {};

        const sql_offset_obj = {
          $req_len: parseInt(request.query.length),
          $req_start: parseInt(request.query.start),
        };

        switch (cur_params.active_page) {
          case "main":
            sql_filter_list.push(
              "jobs.status in ('pending','voting', 'running')"
            );
            break;
          case "my_jobs":
            sql_filter_list.push("jobs.user_id = $usr_id");
            sql_filter_obj["$usr_id"] = cur_sess.user_id;
            break;
          case "leader":
            sql_filter_list.push("jobs.status in ('done', 'voting')");
            sql_order = " ORDER BY jobs.likes DESC";
            break;
        }

        if (sql_filter_list.length == 0) sql_filter_list.push("1"); // In case not filters were provided, selece with WHERE 1

        const res_jobs_obj = Object.assign(
          {},
          sql_main_obj,
          sql_filter_obj,
          sql_order_obj,
          sql_offset_obj
        );
        const res_jobs_sql =
          sql_fields_main +
          sql_filter_list.join(" AND ") +
          sql_order +
          sql_offset_lim;

        const res_count_obj = Object.assign({}, sql_filter_obj, sql_order_obj);
        const res_count_sql =
          sql_count_main + sql_filter_list.join(" AND ") + sql_order;

        db.all(res_jobs_sql, res_jobs_obj, (err, rows_data) => {
          if (err) throw "Was not able to select DB";
          db.get(res_count_sql, res_count_obj, (err, rows_count) => {
            if (err) throw "Was not able to select DB";

            var out_data = [];

            rows_data.forEach((el, i) => {
              var tmp_obj = {};

              request.query.columns.forEach((in_el) => {
                if (in_el.data == "likes") {
                  if (
                    el.user_id == cur_sess.user_id ||
                    UNLIKABLE_STATUSES.includes(el.status)
                  ) {
                    // Pass just number
                    tmp_obj[in_el.data] = el.likes;
                  } else {
                    // Pass button
                    if (el.usr_like) {
                      tmp_obj[in_el.data] = `
                      <div class="row">
                        <div class="col-4 d-flex justify-content-center align-items-center"><div>${
                          el.likes
                        }</div></div>
                        <div class="col-6">
                          <div class="btn btn-sm btn-icon btn-outline-danger btn-hover-rotate-${
                            (i & 1) == 0 ? "end" : "start"
                          } me-1 btn-outline" onclick="on_like_click(${
                        el.id
                      })"><i class="fas fa-heart-broken text-black"></i></div>
                        </div>
                      </div>`;
                    } else {
                      tmp_obj[in_el.data] = `
                      <div class="row">
                        <div class="col-4 d-flex justify-content-center align-items-center"><div>${
                          el.likes
                        }</div></div>
                        <div class="col-6">
                        <div class="btn btn-sm btn-icon btn-danger btn-hover-rotate-${
                          (i & 1) == 0 ? "end" : "start"
                        } me-1" onclick="on_like_click(${
                        el.id
                      })"><i class="fas fa-heart text-white"></i></div>
                        </div>
                      </div>`;
                    }
                  }
                } else if (in_el.data == "status") {
                  const status_res = Object.values(STATUSES).find(
                    (sel) => sel.value == el[in_el.data]
                  );

                  if (status_res) {
                    tmp_obj[in_el.data] = status_res.render;
                  } else {
                    tmp_obj[in_el.data] = el[in_el.data];
                  }
                } else tmp_obj[in_el.data] = el[in_el.data];
              });

              out_data.push(tmp_obj);
            });

            response.status(200).send(
              JSON.stringify({
                draw: request.query.draw,
                recordsTotal: rows_count.cnt,
                recordsFiltered: rows_count.cnt,
                data: out_data,
              })
            );
          });
        });
      },
      (rej) => {
        throw "User not in authorized";
      }
    )
    .catch((e) => {
      response.send(JSON.stringify({ success: false }));
    });
});

app.get("/toggle_like", (request, response) => {
  check_session(request.cookies)
    .then(
      (cur_sess) => {
        if ("job_id" in request.query == false)
          throw "Not job to like was provided";

        db.get(
          "SELECT jobs.user_id, jobs.status FROM jobs WHERE jobs.id = ?",
          [parseInt(request.query.job_id)],
          (err, row) => {
            if (err) throw "Was not able to select likes table";

            if (!row) {
              response.status(500).send(RES_FAIL);
              return;
            }

            if (
              cur_sess.user_id == row.user_id ||
              UNLIKABLE_STATUSES.includes(row.status)
            ) {
              response.status(500).send(RES_FAIL); // Attempt of like own job or like of unlikable job
              return;
            }

            db.get(
              "SELECT likes.id FROM likes WHERE likes.job_id = ? AND likes.user_id = ?",
              [request.query.job_id, cur_sess.user_id],
              (err, like_row) => {
                if (err) throw "Was not able to select like with given job id";

                var main_sql = "";
                var main_params = [];

                if (like_row) {
                  main_sql = "DELETE FROM likes WHERE likes.id = ?";
                  main_params = [like_row.id];
                } else {
                  main_sql =
                    "INSERT INTO likes (id, user_id, job_id, whn) VALUES((SELECT IFNULL(MAX(a.id), 0) + 1 FROM likes a), ?, ?, ?)";
                  main_params = [
                    cur_sess.user_id,
                    request.query.job_id,
                    Date.now(),
                  ];
                }

                db.run(main_sql, main_params, (err) => {
                  if (err) {
                    response.status(200).send(RES_FAIL);
                    return;
                  }

                  db.run(
                    `UPDATE jobs SET likes = likes ${
                      like_row ? "-" : "+"
                    } 1 WHERE jobs.id = ?`,
                    [request.query.job_id],
                    (err) => {
                      if (err) response.status(200).send(RES_FAIL);
                      else response.status(200).send(RES_SUCCESS);
                    }
                  );
                });

                // new Promise((resolve, reject) => {
                //   if (like_row) {
                //     db.serialize(() => {
                //       db.run("DELETE FROM likes WHERE likes.id = ?", [
                //         like_row.id,
                //       ]).run(
                //         "UPDATE jobs SET likes = likes - 1 WHERE jobs.id = ?",
                //         [request.query.job_id],
                //         (err) => {
                //           (err) => {
                //             if (err) reject("Was not able to add like");
                //             resolve(true);
                //           };
                //         }
                //       );
                //     });
                //   } else {
                //     db.serialize(() => {
                //       db.run(
                //         "INSERT INTO likes (id, user_id, job_id, whn) VALUES((SELECT IFNULL(MAX(a.id), 0) + 1 FROM likes a), ?, ?, ?)",
                //         [cur_sess.user_id, request.query.job_id, Date.now()]
                //       ).run(
                //         "UPDATE jobs SET likes = likes + 1 WHERE jobs.id = ?",
                //         [request.query.job_id],
                //         (err) => {
                //           (err) => {
                //             if (err) reject("Was not able to add like");
                //             resolve(true);
                //           };
                //         }
                //       );
                //     }).then;
                //   }
                // }).then(
                //   (res) => {},
                //   (rej) => {}
                // );
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
      response.status(500).send(RES_FAIL);
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
    (cur_sess) => {
      response
        .cookie("session", request.cookies["session"], {
          expires: new Date(Date.now() + 86400000),
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

// Returns promise, if rejected - then cookie list does not contain active session, resolved - active session was found
function check_session(cookies) {
  var ret_val;
  if ("session" in cookies) {
    ret_val = new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM sessions WHERE session_id = ?",
        [cookies["session"]],
        (err, row) => {
          if (err || !row) reject(false);
          resolve(row);
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

function set_session_id(sub) {
  var random_str = uuid.v4();
  console.log("Adding new session with random string: ", random_str);

  db.run(
    "INSERT INTO sessions(user_id, session_id, time, params) VALUES((SELECT id FROM users WHERE ext_id = ?), ?, ?, ?)",
    [sub, random_str, Date.now(), JSON.stringify({ active_page: "main" })]
  );

  return random_str;
}

function hidden_email(payload) {
  if ("email" in payload)
    return payload.email.replace(/(\w{3})[\w.-]+@([\w.]+\w)/, "$1***@$2");
  else return "hidden_email";
}

function hidden_username(querry) {
  if ("login" in querry)
    return querry.login.replace(/(\w{3})[\w.-]+(\w)/, "$1****$2");
  else return "anonymous";
}

function object_empty(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) return false;
  }
  return true;
}
