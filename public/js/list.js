"use strict";
var dt;
const modal_state = { oppened: false, refresh_on_close: false };
// Class definition
var KTDatatablesServerSide = (function () {
  // Shared variables
  var table;
  var filterPayment;

  // Private functions
  var initDatatable = function () {
    localStorage.removeItem("DataTables_kt_datatable_example_1_/");
    dt = $("#kt_datatable_example_1").DataTable({
      searchDelay: 500,
      processing: false,
      serverSide: true,
      order: [],
      stateSave: true,
      select: {
        style: "os",
        selector: "td:first-child",
        className: "row-selected",
      },
      ajax: {
        url: "query_table",
      },
      columns: current_columns,
      columnDefs: [],
      createdRow: function (row, data, dataIndex) {
        $(row).find("td:eq(4)").attr("data-filter", data.CreditCardType);
      },
    });

    table = dt.$;

    dt.on("draw", function () {
      KTMenu.createInstances();

      document.querySelectorAll(".jobs_modal_el").forEach((modal) => {
        modal.addEventListener("hidden.bs.modal", function () {
          if (modal_state.refresh_on_close) {
            modal_state.refresh_on_close = false;
            dt.ajax.reload(null, false);
          }
          modal_state.oppened = false;
        });
      });

      document.querySelectorAll(".jobs_info_btn").forEach((modal_btn) => {
        modal_btn.addEventListener("click", function () {
          modal_state.oppened = true;
        });
      });
    });
  };

  // Public methods
  return {
    init: function () {
      initDatatable();
    },
  };
})();

// On document ready
KTUtil.onDOMContentLoaded(function () {
  KTDatatablesServerSide.init();
});

function on_like_click(job_id) {
  fetch(`/toggle_like?job_id=${job_id}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        dt.ajax.reload(null, false);
      }
    });
}

function on_cancle_click(job_id) {
  Swal.fire({
    title: "<strong>Are you sure you want to cancle this job?</strong>",
    icon: "warning",
    html: `Job with ID: <b>${job_id}</b> will be cancled and removed from main excecution queue. <b>No one except you will be able to see or like this job</b>`,
    showCloseButton: true,
    focusConfirm: false,
    confirmButtonText: "Do it!",
  }).then(function (ret) {
    if (ret.isConfirmed) {
      fetch(`/cancle_job?job_id=${job_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            dt.ajax.reload(null, false);
          }
        });
    }
    console.log(ret);
  });
}

var socket;
var connection_timeout;
try_connect_ws();

function try_connect_ws() {
  socket = new WebSocket((window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host + "/ws");

  socket.onopen = on_ws_open;
  socket.onmessage = on_ws_message;
  socket.onclose = on_ws_close;
}

function on_ws_open(msg) {
  console.log("Subscribed to server events");
}

function on_ws_close(msg) {
  clearTimeout(try_connect_ws);
  setTimeout(try_connect_ws, 5000);
}

// $(".jobs_info_btn").each(function () {
//   console.log($(this));
//   $(this).on("hidden.bs.modal", function () {
//     console.log("Closed");
//     if (modal_state.refresh_on_close) {
//       modal_state.refresh_on_close = false;
//       dt.ajax.reload(null, false);
//     }
//     modal_state.oppened = false;
//   });

//   $(this).on("show", function () {
//     console.log("Oppened modal");
//     modal_state.oppened = true;
//   });
// });

function on_ws_message(msg) {
  console.log("WS receive!: ", msg.data)
  const in_msg = JSON.parse(msg.data);
  if (in_msg.update_list) {
    if (!modal_state.oppened) dt.ajax.reload(null, false);
    else modal_state.refresh_on_close = true;
  }
}
