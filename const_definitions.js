const path = require("path");
const fs = require("fs");

// Renders helpers
const ROW_R = (row) => `<th db_name="${row.db_name}">${row.name}</th>`;

// Create status bage with btn_type and display name
const STATUS_BAGE_R = (btn_type, disp) =>
  `<div class='row'><div class='col-12 d-flex justify-content-center text-center'><span class='badge badge-${btn_type}'>${disp}</span></div></div>`;

// Create list columns passing list with {db_name, name}
const LIST_ROWS_R = (rows_list) => {
  var res = "";
  rows_list.forEach((r) => (res += ROW_R(r)));
  return res;
};

const LIKES_R = (likes_amount, job_id, row_id, btn_classes, i_classes) =>
  `<div class="row"><div class="col-4 d-flex justify-content-center align-items-center"><div>${likes_amount}</div></div><div class="col-6"><div class="btn btn-sm btn-icon btn-outline-danger btn-hover-rotate-${
    (row_id & 1) == 0 ? "end" : "start"
  } me-1 btn-outline ${btn_classes}" onclick="on_like_click(${job_id})"><i class="fas ${i_classes}"></i></div></div></div>`;

// Renders
global.LIKE_BTN = (likes_amount, job_id, row_id) =>
  LIKES_R(likes_amount, job_id, row_id, "btn-danger", "fa-heart text-white");

global.UNLIKE_BTN = (likes_amount, job_id, row_id) =>
  LIKES_R(likes_amount, job_id, row_id, "", "fa-heart-broken text-black");

global.FILES_BUTTON = (job_id) =>
  `<a href="/get_job_files?job_id=${job_id}" download="job_${job_id}.zip" class="btn btn-info btn-hover-scale"><i class="bi bi-file-earmark-arrow-down-fill"></i> Files</a>`;

global.ACTIVE_CANCLE_BTN = (job_id) =>
  `<div class="btn btn-danger" onclick="on_cancle_click(${job_id})"><i class="bi bi-x-octagon"></i> Cancle</div>`;
global.DISABLED_CANCLE_BTN = () =>
  `<div class="btn btn-danger disabled"><i class="bi bi-x-octagon"></i> Cancle</div>`;

// Statuses
global.STATUSES = {
  SUBMITED: {
    value: "submited",
    render: STATUS_BAGE_R("light-primary", "submited"),
  },
  VALIDATING: {
    value: "validating",
    render: STATUS_BAGE_R("light-dark", "validating"),
  },
  PENDING: {
    value: "pending",
    render: STATUS_BAGE_R("light-warning", "pending"),
  },
  RUNNING: {
    value: "running",
    render: STATUS_BAGE_R("light-info", "running"),
  },
  VOTING: {
    value: "voting",
    render: STATUS_BAGE_R("success", "voting"),
  },
  DONE: {
    value: "done",
    render: STATUS_BAGE_R("light-success", "done"),
  },
  CANCELED: {
    value: "canceled",
    render: STATUS_BAGE_R("light-danger", "canceled"),
  },
  ERROR: {
    value: "error",
    render: STATUS_BAGE_R("danger", "error"),
  },
};

global.LIKABLE_STATUSES = [
  STATUSES.RUNNING.value,
  STATUSES.VOTING.value,
  STATUSES.DONE.value,
];

global.CANCLABLE_STATUSES = [
  STATUSES.SUBMITED.value,
  STATUSES.VALIDATING.value,
  STATUSES.PENDING.value,
];

// Lists
global.LIST_VIEWS = {
  MAIN: LIST_ROWS_R([
    { db_name: "id", name: "Task ID" },
    { db_name: "username", name: "User" },
    { db_name: "note", name: "Notes" },
    { db_name: "whn", name: "Submited On" },
    { db_name: "status", name: "Status" },
    { db_name: "likes", name: "Likes" },
  ]),
  MY_JOBS: LIST_ROWS_R([
    { db_name: "id", name: "Task ID" },
    { db_name: "note", name: "Notes" },
    { db_name: "whn", name: "Submited On" },
    { db_name: "status", name: "Status" },
    { db_name: "likes", name: "Likes" },
    { db_name: "files", name: "Files" },
    { db_name: "cancle", name: "Cancle Job" },
  ]),
  LEADER: LIST_ROWS_R([
    { db_name: "id", name: "Task ID" },
    { db_name: "username", name: "User" },
    { db_name: "note", name: "Notes" },
    { db_name: "whn", name: "Submited On" },
    { db_name: "status", name: "Status" },
    { db_name: "likes", name: "Likes" },
  ]),

  PROFILE: LIST_ROWS_R([{ db_name: "id", name: "Task ID" }]),
};

// Session
global.SESSION_LENGTH = 86400000;

global.RES_SUCCESS = JSON.stringify({ success: true });
global.RES_FAIL = JSON.stringify({ success: false });

// API
global.GOOGLE_CLIENT_ID =
  "589100687475-a5os5k6fob930dm7ns7fvmar32p71qrp.apps.googleusercontent.com";
global.GITHUB_CLIENT_ID = "e770e6440fbaac8200a7";
global.GITHUB_CLIENT_SECRET = "2efd546aa39c3fbccc6eff4433aa8225ce4a7975";

// User
global.DEFUALT_PICTURE = "./img/default_avatar.png";
global.JOBS_CODE_DIR = path.resolve(__dirname, "jobs_folder");

// App
global.APP_PORT = 3000;

// Files templates
fs.readFile(
  path.resolve(__dirname, "templates/", "aside.html"),
  (err, data) => {
    if (err) throw err;
    global.ASIDE_HTML_FILE = data.toString("utf-8");
  }
);

fs.readFile(path.resolve(__dirname, "templates/", "list.html"), (err, data) => {
  if (err) throw err;
  global.LIST_HTML_FILE = data.toString("utf-8");
});
