const path = require("path");
const fs = require("fs");

// Renders helpers
const ROW_R = (row) => `<th db_name="${row.db_name}">${row.name}</th>`;

// Create status bage with btn_type and display name
const STATUS_BAGE_R = (btn_type, disp) =>
  `<div class="col-6"><div class='col-12 d-flex justify-content-center text-center'><span class='badge badge-${btn_type}'>${disp}</span></div></div>`;

// Create list columns passing list with {db_name, name}
const LIST_ROWS_R = (rows_list) => {
  var res = "";
  rows_list.forEach((r) => (res += ROW_R(r)));
  return res;
};

const LIKES_R = (likes_amount, job_id, row_id, btn_classes, i_classes) => `
<div class="row">
  <div class="col-4 d-flex justify-content-center align-items-center">
    <div>${likes_amount}</div>
  </div>
  <div class="col-6">
    <div class="btn btn-sm btn-icon btn-outline-danger btn-hover-rotate-${(row_id & 1) == 0 ? "end" : "start"
  } me-1 btn-outline ${btn_classes}" onclick="on_like_click(${job_id})">
      <i class="fas ${i_classes}"></i>
    </div>
  </div>
</div>`;

// Renders

//
global.MAIN_PAGE_RENDER = (avatar, username, cur_page, show_upload, user_id, profile) =>
  LIST_HTML_FILE.replace(/{:AVATAR:}/g, avatar)
    .replace(/{:TABLE_NAME:}/g, LISTS_NAMES[cur_page])
    .replace(/{:UPLOAD_BTN:}/g, show_upload ? UPLOAD_BTN : "")
    .replace(/{:USERNAME:}/g, username)
    .replace(/{:USER_ID:}/g, user_id)
    .replace(/{:PROFILE:}/g, profile ? profile : "") // Insert avatsrs
    .replace(/{:LIST_LAY:}/, LIST_VIEWS[cur_page]) // Inser List layout
    .replace(
      /{:ASIDE:}/g,
      ASIDE_HTML_FILE.replace(ASIDE_ATTRIBUTES[cur_page], "here show").replace(/{:MENU1:}|{:MENU2:}|{:MENU3:}/, "")
    );

global.PROFILE_RENDER = (avatar, username, total_likes, total_jobs, user_rank, total_users) =>
  PROFILE_HTML_FILE.replace(/{:AVATAR:}/g, avatar)
    .replace(/{:USERNAME:}/g, username)
    .replace(/{:TOTAL_LIKES:}/g, total_likes)
    .replace(/{:TOTAL_SUBMISSIONS:}/g, total_jobs)
    .replace(/{:USERS_PERCENT:}/g, Math.round(((user_rank - 1) / total_users) * 10000) / 100)
    .replace(/{:USERS_TOP:}/g, user_rank)
    .replace(/{:TOTAL_USERS:}/g, total_users);

global.UPLOAD_BTN =
  '<div class="card-toolbar"><button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#kt_modal_add_customer"><span class="svg-icon svg-icon-2"></span>Upload code</button></div>';

global.VIDEO_BTN = (url) => `<a href='${url}' target='_blank'>Open Video</a>`;

global.USERNAME_RENDER = (user_name, user_id) =>
  `<a href="open_profile?user_id=${user_id}" class="text-gray-900 text-hover-primary fw-bolder me-1">${user_name}</a>`;

global.LIKE_BTN = (likes_amount, job_id, row_id) => LIKES_R(likes_amount, job_id, row_id, "btn-danger", "fa-heart text-white");

global.UNLIKE_BTN = (likes_amount, job_id, row_id) => LIKES_R(likes_amount, job_id, row_id, "", "fa-heart-broken text-black");

global.FILES_BUTTON = (job_id) =>
  `<a href="/get_job_files?job_id=${job_id}" download="job_${job_id}.zip" class="btn btn-sm btn-info btn-hover-scale"><i class="bi bi-file-earmark-arrow-down-fill"></i> Files</a>`;

global.ACTIVE_CANCEL_BTN = (job_id) =>
  `<div class="btn btn-sm btn-danger btn-hover-rise" onclick="on_cancel_click(${job_id})"><i class="bi bi-x-octagon"></i> Cancel</div>`;
global.DISABLED_CANCEL_BTN = () => `<div class="btn btn-sm btn-danger disabled"><i class="bi bi-x-octagon"></i> Cancel</div>`;

global.ERROR_BUTTON_MODAL = (title, err, i) =>
  `
<div class="col-6"><div class="btn btn-sm btn-icon btn-light-info text-white me-1 jobs_info_btn" data-bs-toggle="modal" data-bs-target="#kt_modal_${i}"><i class="bi bi-info-square-fill"></i></div></div>
<div class="modal fade jobs_modal_el" tabindex="-1" id="kt_modal_${i}">
  <div class="modal-dialog"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title">${title}</h5></div>
    <div class="modal-body"><pre>${err}</pre></div>
    <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Close</button></div>
  </div></div>
</div>`;

global.LIST_VIEWS = {
  main: LIST_ROWS_R([
    { db_name: "id", name: "Task ID" },
    { db_name: "username", name: "User" },
    { db_name: "note", name: "Notes" },
    { db_name: "whn", name: "Submited On" },
    { db_name: "status", name: "Status" },
    { db_name: "likes", name: "Likes" },
  ]),
  my_jobs: LIST_ROWS_R([
    { db_name: "id", name: "Task ID" },
    { db_name: "note", name: "Notes" },
    { db_name: "whn", name: "Submited On" },
    { db_name: "status", name: "Status" },
    { db_name: "video_url", name: "Video" },
    { db_name: "likes", name: "Likes" },
    { db_name: "files", name: "Files" },
    { db_name: "cancel", name: "Cancel Job" },
  ]),
  leader: LIST_ROWS_R([
    { db_name: "id", name: "Task ID" },
    { db_name: "username", name: "User" },
    { db_name: "note", name: "Notes" },
    { db_name: "whn", name: "Submited On" },
    { db_name: "status", name: "Status" },
    { db_name: "video_url", name: "Video" },
    { db_name: "likes", name: "Likes" },
  ]),

  profile: LIST_ROWS_R([
    { db_name: "id", name: "Task ID" },
    { db_name: "note", name: "Notes" },
    { db_name: "whn", name: "Submited On" },
    { db_name: "video_url", name: "Video" },
    { db_name: "likes", name: "Likes" },
  ]),
};

global.global.STATUSES = {
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
  RENDERING: {
    value: "rendering",
    render: STATUS_BAGE_R("light-warning", "rendering"),
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

global.PAGES_VIEWS_LIST = ["main", "my_jobs", "leader", "profile"];

global.ASIDE_ATTRIBUTES = { main: /{:MENU1:}/g, my_jobs: /{:MENU2:}/g, leader: /{:MENU3:}/g, profile: /a^/ };

global.LISTS_NAMES = {
  main: "Exececution Jobs Queue",
  my_jobs: "My Jobs",
  leader: "Top Jobs",
  profile: "Top User's Jobs",
};

global.LIKABLE_STATUSES = [STATUSES.VOTING.value, STATUSES.DONE.value];

global.CANCLABLE_STATUSES = [STATUSES.SUBMITED.value, STATUSES.VALIDATING.value, STATUSES.PENDING.value];

global.ADDEBLAE_STATUSES = [STATUSES.PENDING.value, STATUSES.VALIDATING.value, STATUSES.SUBMITED.value];

// Session
global.SESSION_LENGTH = 86400;

global.RES_SUCCESS = JSON.stringify({ success: true });
global.RES_FAIL = JSON.stringify({ success: false });

// API
global.GOOGLE_CLIENT_ID = "589100687475-a5os5k6fob930dm7ns7fvmar32p71qrp.apps.googleusercontent.com";
global.GITHUB_CLIENT_ID = "e770e6440fbaac8200a7";
global.GITHUB_CLIENT_SECRET = "2efd546aa39c3fbccc6eff4433aa8225ce4a7975";

// User
global.DEFUALT_PICTURE = "./img/default_avatar.png";

// App
global.APP_PORT = 3001;
global.NO_CACHE_HEADERS = (res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
};

// Files templates
fs.readFile(path.resolve(__dirname, "templates/", "aside.html"), (err, data) => {
  if (err) throw err;
  global.ASIDE_HTML_FILE = data.toString("utf-8");
});

fs.readFile(path.resolve(__dirname, "templates/", "main.html"), (err, data) => {
  if (err) throw err;
  global.LIST_HTML_FILE = data.toString("utf-8");
});

fs.readFile(path.resolve(__dirname, "templates/", "profile.html"), (err, data) => {
  if (err) throw err;
  global.PROFILE_HTML_FILE = data.toString("utf-8");
});

//Files
global.TMP_FILES_DIR = path.join(__dirname, "uploaded_files_tmp");
global.JOBS_CODE_DIR = path.resolve(__dirname, "jobs_folder");

if (!fs.existsSync(TMP_FILES_DIR)) {
  fs.mkdirSync(TMP_FILES_DIR);
  console.log("Created tmp files dir");
}

if (!fs.existsSync(JOBS_CODE_DIR)) {
  fs.mkdirSync(JOBS_CODE_DIR);
  console.log("Created jobs folder");
}

// WebSocket
// SOCKET_EVENTS -> type: []
// type - event name
// [] - update too all who are on pages in this list
global.SOCKET_EVENTS = ["ADD_JOB", "LIKE_JOB", "JOB_STATUS_CHANGE"];

global.WS_UPDATE_LIST = JSON.stringify({ update_list: true });
