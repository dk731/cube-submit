const { parse: parseQuery } = require("querystring");
const WebSocketServer = require("websocket").server;
var npEscape = require("mysql-named-params-escape");
let formidable = require("express-formidable");
const cookie_parser = require("cookie-parser");
const express = require("express");
const mysql = require("mysql2");
var zip = require("express-zip");
const axios = require("axios");
const uuid = require("uuid");
const path = require("path");
const fs = require("fs");

const _ = require("./const_definitions"); // Import all constant definitions

const { OAuth2Client } = require("google-auth-library");
const { request, response } = require("express");
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

fs.readdir(TMP_FILES_DIR, (err, files) => {
  if (err) throw err;
  files.forEach((file) =>
    fs.unlink(path.resolve(TMP_FILES_DIR, file), (err) => {
      if (err) throw err;
      console.log("Cleared tmp files folder!");
    })
  );
});

var db;
db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: process.env.MYSQL_PSWD,
  database: "try_cubic",
});
db.connect(function (err) {
  if (err) throw err;
  console.log("Connected to MySQL DB!");
});
db.config.queryFormat = npEscape;

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie_parser());
app.use(
  formidable({
    encoding: "utf-8",
    uploadDir: TMP_FILES_DIR,
    multiples: true,
    keepExtensions: true,
    maxFileSize: 3 * 1024 * 1024,
    filter: function ({ name, originalFilename, mimetype }) {
      console.log(name);
      return false;
    },
  })
);

const server = app.listen(APP_PORT, () => {
  console.log(`Example app listening at http://localhost:${APP_PORT}`);
});

const ws_server = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false,
});

app.get("/", (request, response) => {
  check_session(request.cookies)
    .then(
      (cur_sess) => {
        if (object_empty(request.query)) {
          const cur_page = cur_sess.params.active_page;

          if (!PAGES_VIEWS_LIST.includes(cur_page)) return response.status(301).redirect("/?menu=main");

          db.query("SELECT avatar, username FROM users WHERE users.id = :user_id", { user_id: cur_sess.user_id }, (err, row) => {
            if (err) throw err;

            response.status(200).send(
              // Render
              LIST_HTML_FILE.replace(/{:AVATAR:}/g, row[0].avatar)
                .replace(/{:USERNAME:}/g, row[0].username)
                .replace(/{:PROFILE:}/g, PROFILE_HTML_FILE) // Insert avatsrs
                .replace(/{:LIST_LAY:}/, LIST_VIEWS[cur_page]) // Inser List layout
                .replace(/{:ASIDE:}/g, ASIDE_HTML_FILE.replace(ASIDE_ATTRIBUTES[cur_page], "here show").replace(/{:MENU1:}|{:MENU2:}|{:MENU3:}/, ""))
            );
          });
        } else {
          db.query(`UPDATE sessions SET params = JSON_SET(params, '$.active_page', :active_page) WHERE sessions.id = :session_id`, { session_id: cur_sess.id, active_page: request.query.menu }, (err, rows) => {
            if (err) throw "Was not able to set session active page";
            response.status(301).redirect("/");
          });
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
        const sql_cur_usr_likes = "(SELECT count(*) FROM likes WHERE likes.job_id = jobs.id AND likes.user_id = :usr_id)";
        const sql_user_req = "(SELECT users.username FROM users WHERE users.id = jobs.user_id)";

        const sql_fields_main = `SELECT jobs.id, ${sql_user_req} username, jobs.user_id, jobs.note, jobs.whn, jobs.error, jobs.status, jobs.likes, jobs.video_url, ${sql_cur_usr_likes} usr_like FROM jobs WHERE `;
        const sql_count_main = "SELECT count(*) cnt FROM jobs WHERE ";

        const sql_filter_list = [];
        var sql_order = " ORDER BY jobs.id";
        const sql_offset_lim = " LIMIT :req_len OFFSET :req_start";

        const sql_main_obj = { usr_id: cur_sess.user_id };

        const sql_filter_obj = {};

        const sql_order_obj = {};

        const sql_offset_obj = {
          req_len: parseInt(request.query.length),
          req_start: parseInt(request.query.start),
        };

        switch (cur_sess.params.active_page) {
          case "main":
            sql_filter_list.push("jobs.status in ('pending','voting', 'running')");
            break;
          case "my_jobs":
            sql_filter_list.push("jobs.user_id = :usr_id");
            sql_filter_obj["usr_id"] = cur_sess.user_id;
            break;
          case "leader":
            sql_filter_list.push("jobs.status in ('done', 'voting')");
            sql_order = " ORDER BY jobs.likes DESC";
            break;
        }

        if (sql_filter_list.length == 0) sql_filter_list.push("1"); // In case not filters were provided, selece with WHERE 1

        const res_jobs_obj = Object.assign({}, sql_main_obj, sql_filter_obj, sql_order_obj, sql_offset_obj);
        const res_jobs_sql = sql_fields_main + sql_filter_list.join(" AND ") + sql_order + sql_offset_lim;

        const res_count_obj = Object.assign({}, sql_filter_obj, sql_order_obj);
        const res_count_sql = sql_count_main + sql_filter_list.join(" AND ") + sql_order;

        db.query(res_jobs_sql, res_jobs_obj, (err, rows_data) => {
          if (err) throw "Was not able to select DB";
          db.query(res_count_sql, res_count_obj, (err, rows_count) => {
            if (err) throw "Was not able to select DB";

            var out_data = [];

            rows_data.forEach((el, i) => {
              var tmp_obj = {};

              request.query.columns.forEach((in_el) => {
                switch (in_el.data) {
                  case "likes":
                    {
                      // Check if row is was not created by current user, if was then send just number else send like button
                      if (el.user_id != cur_sess.user_id && LIKABLE_STATUSES.includes(el.status)) {
                        tmp_obj["likes"] = el.usr_like ? UNLIKE_BTN(el.likes, el.id, i) : LIKE_BTN(el.likes, el.id, i);
                      } else {
                        tmp_obj["likes"] = el.likes;
                      }
                    }
                    break;
                  case "status":
                    {
                      const cur_status = Object.values(STATUSES).find((sel) => sel.value == el.status);

                      // Check if status exists, if not then return plain status value
                      if (!cur_status) tmp_obj["status"] = el.status;
                      // Check if job has error, if yes check if this is current user job then return status with error
                      else if (el.error && cur_sess.user_id == el.user_id) {
                        tmp_obj["status"] = `<div class="row d-flex justify-content-center align-items-center">${cur_status.render}${ERROR_BUTTON_MODAL("Files you sumbited for this job returned with error", el.error, i)}</div>`;
                      } else {
                        // Return just status
                        tmp_obj["status"] = cur_status.render;
                      }
                    }
                    break;
                  case "files":
                    tmp_obj["files"] = FILES_BUTTON(el.id);
                    break;
                  case "whn":
                    tmp_obj["whn"] = new Date(el.whn).toLocaleDateString();
                    break;
                  case "cancle":
                    tmp_obj["cancle"] = CANCLABLE_STATUSES.includes(el.status) ? ACTIVE_CANCLE_BTN(el.id) : DISABLED_CANCLE_BTN();
                    break;
                  case "video_url":
                    tmp_obj.video_url = el.video_url ? VIDEO_BTN(el.video_url) : "Video is currently unavailable";
                    break;
                  default:
                    {
                      tmp_obj[in_el.data] = el[in_el.data];
                    }
                    break;
                }
              });

              out_data.push(tmp_obj);
            });

            response.status(200).send(
              JSON.stringify({
                draw: request.query.draw,
                recordsTotal: rows_count[0].cnt,
                recordsFiltered: rows_count[0].cnt,
                data: out_data,
              })
            );
          });
        });
      },
      (rej) => {
        throw "User is not authorized";
      }
    )
    .catch((e) => {
      response.send(JSON.stringify({ success: false }));
    });
});

app.get("/cancle_job", (request, response) => {
  check_session(request.cookies)
    .then(
      (cur_sess) => {
        db.query("SELECT jobs.status FROM jobs WHERE jobs.user_id = :user_id AND jobs.id = :job_id", { user_id: cur_sess.user_id, job_id: request.query.job_id }, (err, row) => {
          if (err) throw "Error during check if current user is job creator";
          if (!row[0] || !row[0].status) return response.status(200).send(RES_FAIL);
          if (!CANCLABLE_STATUSES.includes(row[0].status)) return response.status(200).send(RES_FAIL);

          db.query("UPDATE jobs SET status = :status WHERE jobs.id = :job_id", { status: "canceled", job_id: request.query.job_id }, (err) => {
            if (err) return response.status(500).send(RES_FAIL);
            response.status(200).send(RES_SUCCESS);

            ws_server.broadcast({
              type: "CANCLE_JOB",
              initiator_sess: cur_sess.id,
            });
          });
        });
      },
      (rej) => {
        throw "Cant cancle job withput active session";
      }
    )
    .catch((err) => {
      response.status(500).send(RES_FAIL);
    });
});

app.get("/profile", (request, response) => {
  check_session(request.cookies)
    .then(
      (cur_sess) => {},
      (rej) => {
        response.status(200).redirect("/signin");
      }
    )
    .catch((err) => {
      response.status(500).send(RES_FAIL);
    });
});

app.get("/toggle_like", (request, response) => {
  check_session(request.cookies)
    .then(
      (cur_sess) => {
        if ("job_id" in request.query == false) throw "Not job to like was provided";

        db.query("SELECT jobs.user_id, jobs.status FROM jobs WHERE jobs.id = :job_id", { job_id: parseInt(request.query.job_id) }, (err, row) => {
          if (err) throw "Was not able to select likes table";

          if (!row) {
            response.status(500).send(RES_FAIL);
            return;
          }

          if (cur_sess.user_id == row[0].user_id || !LIKABLE_STATUSES.includes(row[0].status)) {
            response.status(500).send(RES_FAIL); // Attempt of like own job or like of unlikable job
            return;
          }

          db.query("SELECT likes.id FROM likes WHERE likes.job_id = :job_id AND likes.user_id =:user_id", { job_id: request.query.job_id, user_id: cur_sess.user_id }, (err, like_row) => {
            if (err) throw "Was not able to select like with given job id";

            var main_sql = "";
            var main_params = {};

            if (like_row[0]) {
              main_sql = "DELETE FROM likes WHERE likes.id = :like_id";
              main_params.like_id = [like_row[0].id];
            } else {
              main_sql = "INSERT INTO likes (user_id, job_id) VALUES(:user_id, :job_id)";
              main_params.user_id = cur_sess.user_id;
              main_params.job_id = request.query.job_id;
            }

            db.query(main_sql, main_params, (err, rows) => {
              if (err) return response.status(200).send(RES_FAIL);

              db.query(`UPDATE jobs SET likes = likes ${like_row[0] ? "-" : "+"} 1 WHERE jobs.id = :job_id`, { job_id: request.query.job_id }, (err, rows) => {
                if (err) return response.status(200).send(RES_FAIL);
                response.status(200).send(RES_SUCCESS);

                ws_server.broadcast({
                  type: "LIKE_JOB",
                  job_id: request.query.job_id,
                  initiator_sess: cur_sess.id,
                });
              });
            });
          });
        });
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
  check_session(request.cookies)
    .then(
      (cur_sess) => {
        db.query(
          "DELETE from sessions WHERE sessions.id = :session_id",
          {
            session_id: cur_sess.id,
          },
          (err, rows) => {
            if (err) console.log("Error during signout session deletion: ", err);
          }
        );

        response
          .cookie("session", "", {
            expires: 0,
            httpOnly: true,
          })
          .status(200)
          .redirect("/");
      },
      (rej) => {
        throw rej;
      }
    )
    .catch((err) => response.status(500).send(RES_FAIL));
});

app.get("/tokensignin", (request, response) => {
  if ("inst_redir" in request.query) {
    var redir_url = request.query.inst_redir;

    Object.entries(request.query).forEach(([k, v]) => {
      if (!["inst_redir", "rememb_value"].includes(k)) redir_url += "&" + k + "=" + v;
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
          maxAge: 86400000,
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

app.get("/get_job_files", (request, response) => {
  check_session(request.cookies)
    .then(
      (cur_sess) => {
        db.query("SELECT count(*) cnt FROM jobs WHERE jobs.user_id = :user_id AND jobs.id = :job_id", { user_id: cur_sess.user_id, job_id: request.query.job_id }, (err, row) => {
          if (err) throw "Error during check if current user is job creator";

          if (!row || row[0].cnt == 0) return response.status(200).send(RES_FAIL);

          const current_dir = path.resolve(JOBS_CODE_DIR, request.query.job_id.toString());

          const out_file = `job_${request.query.job_id}.zip`;
          files_list = fs.readdirSync(current_dir);
          files_list.forEach(function (file, i, arr) {
            arr[i] = { path: path.resolve(current_dir, file), name: file };
          });

          response.zip(files_list, out_file, (err, bytes) => {
            if (err) console.log("Error happened during upload of job files: ", err);
          });
        });
      },
      (rej) => {
        throw "You cannot download files without active session";
      }
    )
    .catch((e) => {
      response.status(200).send(RES_FAIL);
    });
});

app.post("/upload_job", (request, response) => {
  check_session(request.cookies)
    .then(
      (cur_sess) => {
        const FILE_LIST = Object.values(request.files);
        if (FILE_LIST > 5) throw "Too many files";
        if ("note" in request.fields == false || request.fields.note.length < 5 || request.fields.note.length > 25) throw "Invalid note";

        if (FILE_LIST.find((el) => el.name == "main.py") == undefined) throw "No main.py file was found";

        db.query("INSERT INTO jobs (user_id, note) VALUES(:user_id, :note)", { user_id: cur_sess.user_id, note: request.fields.note }, (err, rows) => {
          if (err) throw "Was not able to inser new job";

          const cur_job_dir = path.resolve(JOBS_CODE_DIR, rows.insertId.toString());

          fs.mkdirSync(cur_job_dir);

          FILE_LIST.forEach((file) => {
            fs.rename(file.path, path.resolve(cur_job_dir, file.name), (err) => {
              if (err) console.log(err);
            });
          });

          response.status(200).send(RES_SUCCESS);
        });
      },
      (rej) => {
        throw "Unauthorized upload";
      }
    )
    .catch((err) => {
      Object.values(request.files).forEach((file) => {
        // Remove all temp files if error occured
        fs.unlink(file.path, (err) => {
          if (err) console.log(err);
        });
      });

      response.status(200).send(RES_FAIL);
    });
  console.log(request);
});

app.get("/job_status_change", (request, response) => {
  // TODO: Check origin is from localhost or Cube renderer
  if (request.socket.remoteAddress != "::ffff:127.0.0.1" || false) return response.status(200).send(RES_FAIL);

  update_job_status = (new_status, error, job_id, clb) =>
    db.query("UPDATE jobs SET status = :status, error = :error WHERE jobs.id = :job_id", { status: new_status, error: error, job_id: job_id }, (err) => {
      if (err) return console.log("Error during status update from python script");
      clb();
    });

  switch (request.query.new_status) {
    case "validating":
      break;
    case "pending":
      update_job_status("pending", request.query.error, request.query.job_id, () => {
        console.log("Updated job status to pending");
        ws_server.broadcast({ type: "STATUS_CHANGE" });
      });
      break;
    case "error":
      update_job_status("error", request.query.error, request.query.job_id, () => {
        console.log("Updated job status to error");
        ws_server.broadcast({ type: "STATUS_CHANGE" });
      });
      break;
    default:
      return response.status(500).send("UNKNOWN NEW STATUS");
      break;
  }

  response.status(200).send(RES_SUCCESS);

  // Send update message to subscribed users
});

// Returns promise, if rejected - then cookie list does not contain active session, resolved - active session was found
function check_session(cookies) {
  var ret_val;
  if ("session" in cookies) {
    ret_val = new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM sessions WHERE sessions.ext_id = :session_id AND UNIX_TIMESTAMP(sessions.whn) > :time",
        {
          session_id: cookies["session"],
          time: Math.floor(Date.now() / 1000) - SESSION_LENGTH,
        },
        (err, row) => {
          if (err || !row.length) return reject(false);
          resolve(row[0]);
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

      add_user(hidden_email(payload), payload.sub, "google", "picture" in payload ? payload.picture : DEFUALT_PICTURE, response);
    })
    .catch((e) => {
      response.status(401).send("Was unable to login with Google :(");
    });
}

function auth_github(request, response) {
  if ("tmp_auth" in request.cookies && request.cookies.tmp_auth == request.query.state) {
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

        if (res_token.status != 200 || "error" in res_query) throw "Error during aqcuaring of github api token";

        axios
          .get("https://api.github.com/user", {
            headers: { Authorization: "token " + res_query.access_token },
          })
          .then((res_api) => {
            add_user(hidden_username(res_api.data), res_api.data.id, "github", "avatar_url" in res_api.data ? res_api.data.avatar_url : DEFUALT_PICTURE, response);
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
    db.query("SELECT count(*) cnt FROM users WHERE users.ext_id = :ext_id AND users.type = :type", { ext_id: ext_id, type: type }, (err, row) => {
      if (err || !row) reject("Was not able to check if users exists");
      if (row[0].cnt == 0) {
        db.query("INSERT INTO users (username, type, ext_id, avatar) VALUES(:username, :type, :ext_id, :avatar)", { username: username, type: type, ext_id: ext_id, avatar: avatar }, (err, row) => {
          if (err) console.log("Error in add user: ", err);
        });
      } else {
        db.query("UPDATE users SET avatar = :avatar WHERE users.ext_id = :ext_id", { avatar: avatar, ext_id: ext_id }, (err, row) => {
          if (err) console.log("Error in avatar update: ", err);
        });
      }
      resolve("Added user");
    });
  }).then((suc) => {
    response
      .cookie("session", set_session_id(ext_id), {
        expires: new Date(Date.now() + SESSION_LENGTH * 1000),
        httpOnly: true,
      })
      .status(200)
      .redirect("/");
  });
}

function set_session_id(sub) {
  var random_str = uuid.v4();
  console.log("Adding new session with random string: ", random_str);

  db.query("INSERT INTO sessions (ext_id, user_id, params) VALUES(:ext_id, (SELECT id FROM users WHERE ext_id = :usr_sub), JSON_OBJECT('active_page', 'main'))", { ext_id: random_str, usr_sub: sub }, (err, row) => {
    if (err) console.log("Error in set_session_id: ", err);
  });

  return random_str;
}

function hidden_email(payload) {
  if ("email" in payload) return payload.email.replace(/(\w{3})[\w.-]+@([\w.]+\w)/, "$1****@$2");
  else return "hidden_email";
}

function hidden_username(querry) {
  if ("login" in querry) return querry.login.replace(/(\w{3})[\w.-]+(\w)/, "$1****$2");
  else return "anonymous";
}

function object_empty(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) return false;
  }
  return true;
}

function clear_expired_sessions() {
  db.query("DELETE FROM sessions WHERE UNIX_TIMESTAMP(sessions.whn) < :time", { time: Math.floor(Date.now() / 1000) - SESSION_LENGTH }, (err) => {
    if (err) console.log("Error  during expired session clearing");
  });
}

clear_expired_sessions();
setTimeout(clear_expired_sessions, 43200000); // Clear expired session every 12 hours

ws_server.on("request", function (request) {
  if (request.origin != "http://trycubic.com:3000") return request.reject();

  const parsed_cookies = {};
  request.cookies.forEach(function (cookie) {
    parsed_cookies[cookie.name] = cookie.value;
  });

  check_session(parsed_cookies)
    .then(
      (cur_sess) => {
        const usr_socket = request.accept(null, request.origin);
        usr_socket.session_id = cur_sess.id;
      },
      (rej) => {
        throw "Only authenticated users can open websocket";
      }
    )
    .catch((err) => request.reject());
});

ws_server.broadcast = function broadcast(event) {
  // STATUS_CHANGE - event is automaticly trigerred by local python sytax checker or by excecutor pc
  // CANCLE_JOB - evene is triggered by user

  const SQL_MAIN = "(JSON_EXTRACT(sessions.params, '$.active_page') = 'main')"; // On main page

  const SQL_MY_JOBS = "(JSON_EXTRACT(sessions.params, '$.active_page') = 'my_jobs' AND sessions.user_id = (SELECT jobs.user_id FROM jobs WHERE jobs.id = :job_id))"; // On my_jobs page and owner of job

  const SQL_NO_CURRENT = "(sessions.id != :session_id)"; // Exclude event initator fro broadcast

  return new Promise((resolve, reject) => {
    switch (event.type) {
      case "LIKE_JOB":
        db.query(`SELECT sessions.id FROM sessions WHERE ${SQL_NO_CURRENT}`, { session_id: event.initiator_sess, job_id: event.job_id }, (err, row_ressions) => {
          if (err) return console.log("Error on SQL broadcast LIKE_JOB request: ", err);

          row_ressions.forEach((row) => {
            const con = ws_server.connections.find((con) => row.id == con.session_id);
            if (con) con.send(WS_UPDATE_LIST);
          });
        });
        break;
      case "CANCLE_JOB":
        db.query(`SELECT sessions.id FROM sessions WHERE ${SQL_NO_CURRENT} AND ${SQL_MAIN}`, { session_id: event.initiator_sess }, (err, row_ressions) => {
          if (err) return console.log("Error on SQL broadcast CANCLE_JOB request: ", err);

          row_ressions.forEach((row) => {
            const con = ws_server.connections.find((con) => row.id == con.session_id);
            if (con) con.send(WS_UPDATE_LIST);
          });
        });
        break;
      case "STATUS_CHANGE":
        db.query(`SELECT sessions.id FROM sessions`, {}, (err, row_ressions) => {
          if (err) return console.log("Error on SQL broadcast CANCLE_JOB request: ", err);

          row_ressions.forEach((row) => {
            const con = ws_server.connections.find((con) => row.id == con.session_id);
            if (con) con.send(WS_UPDATE_LIST);
          });
        });
        break;
      default:
        console.log("UNKNOWN EVENT: ", event);
        break;
    }
    resolve();
  });

  // ws_server.connections.forEach((client) => {
  //   client.send(data);
  // });
};
