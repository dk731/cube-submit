"use strict";
var KTDatatablesServerSide = (function () {
  var e,
    t,
    n = () => {
      document
        .querySelectorAll('[data-kt-docs-table-filter="delete_row"]')
        .forEach((t) => {
          t.addEventListener("click", function (t) {
            t.preventDefault();
            const n = t.target
              .closest("tr")
              .querySelectorAll("td")[1].innerText;
            Swal.fire({
              text: "Are you sure you want to delete " + n + "?",
              icon: "warning",
              showCancelButton: !0,
              buttonsStyling: !1,
              confirmButtonText: "Yes, delete!",
              cancelButtonText: "No, cancel",
              customClass: {
                confirmButton: "btn fw-bold btn-danger",
                cancelButton: "btn fw-bold btn-active-light-primary",
              },
            }).then(function (t) {
              t.value
                ? Swal.fire({
                    text: "Deleting " + n,
                    icon: "info",
                    buttonsStyling: !1,
                    showConfirmButton: !1,
                    timer: 2e3,
                  }).then(function () {
                    Swal.fire({
                      text: "You have deleted " + n + "!.",
                      icon: "success",
                      buttonsStyling: !1,
                      confirmButtonText: "Ok, got it!",
                      customClass: { confirmButton: "btn fw-bold btn-primary" },
                    }).then(function () {
                      e.draw();
                    });
                  })
                : "cancel" === t.dismiss &&
                  Swal.fire({
                    text: n + " was not deleted.",
                    icon: "error",
                    buttonsStyling: !1,
                    confirmButtonText: "Ok, got it!",
                    customClass: { confirmButton: "btn fw-bold btn-primary" },
                  });
            });
          });
        });
    },
    o = function () {
      const t = document.querySelector("#kt_datatable_example_1"),
        n = t.querySelectorAll('[type="checkbox"]'),
        o = document.querySelector(
          '[data-kt-docs-table-select="delete_selected"]'
        );
      n.forEach((e) => {
        e.addEventListener("click", function () {
          setTimeout(function () {
            a();
          }, 50);
        });
      }),
        o.addEventListener("click", function () {
          Swal.fire({
            text: "Are you sure you want to delete selected customers?",
            icon: "warning",
            showCancelButton: !0,
            buttonsStyling: !1,
            showLoaderOnConfirm: !0,
            confirmButtonText: "Yes, delete!",
            cancelButtonText: "No, cancel",
            customClass: {
              confirmButton: "btn fw-bold btn-danger",
              cancelButton: "btn fw-bold btn-active-light-primary",
            },
          }).then(function (n) {
            n.value
              ? Swal.fire({
                  text: "Deleting selected customers",
                  icon: "info",
                  buttonsStyling: !1,
                  showConfirmButton: !1,
                  timer: 2e3,
                }).then(function () {
                  Swal.fire({
                    text: "You have deleted all selected customers!.",
                    icon: "success",
                    buttonsStyling: !1,
                    confirmButtonText: "Ok, got it!",
                    customClass: { confirmButton: "btn fw-bold btn-primary" },
                  }).then(function () {
                    e.draw();
                  });
                  t.querySelectorAll('[type="checkbox"]')[0].checked = !1;
                })
              : "cancel" === n.dismiss &&
                Swal.fire({
                  text: "Selected customers was not deleted.",
                  icon: "error",
                  buttonsStyling: !1,
                  confirmButtonText: "Ok, got it!",
                  customClass: { confirmButton: "btn fw-bold btn-primary" },
                });
          });
        });
    },
    a = function () {
      const e = document.querySelector("#kt_datatable_example_1"),
        t = document.querySelector('[data-kt-docs-table-toolbar="base"]'),
        n = document.querySelector('[data-kt-docs-table-toolbar="selected"]'),
        o = document.querySelector(
          '[data-kt-docs-table-select="selected_count"]'
        ),
        a = e.querySelectorAll('tbody [type="checkbox"]');
      let c = !1,
        r = 0;
      a.forEach((e) => {
        e.checked && ((c = !0), r++);
      }),
        c
          ? ((o.innerHTML = r),
            t.classList.add("d-none"),
            n.classList.remove("d-none"))
          : (t.classList.remove("d-none"), n.classList.add("d-none"));
    };
  return {
    init: function () {
      (e = $("#kt_datatable_example_1").DataTable({
        searchDelay: 500,
        processing: !0,
        serverSide: !0,
        order: [[5, "desc"]],
        stateSave: !0,
        select: {
          style: "os",
          selector: "td:first-child",
          className: "row-selected",
        },
        ajax: { url: "https://preview.keenthemes.com/api/datatables.php" },
        columns: [
          { data: "RecordID" },
          { data: "Name" },
          { data: "Email" },
          { data: "Company" },
          { data: "CreditCardNumber" },
          { data: "Datetime" },
          { data: null },
        ],
        columnDefs: [
          {
            targets: 0,
            orderable: !1,
            render: function (e) {
              return `\n                            <div class="form-check form-check-sm form-check-custom form-check-solid">\n                                <input class="form-check-input" type="checkbox" value="${e}" />\n                            </div>`;
            },
          },
          {
            targets: 4,
            render: function (e, t, n) {
              return (
                `<img src="${hostUrl}media/svg/card-logos/${n.CreditCardType}.svg" class="w-35px me-3" alt="${n.CreditCardType}">` +
                e
              );
            },
          },
          {
            targets: -1,
            data: null,
            orderable: !1,
            className: "text-end",
            render: function (e, t, n) {
              return '\n                            <a href="#" class="btn btn-light btn-active-light-primary btn-sm" data-kt-menu-trigger="click" data-kt-menu-placement="bottom-end" data-kt-menu-flip="top-end">\n                                Actions\n                                <span class="svg-icon svg-icon-5 m-0">\n                                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24px" height="24px" viewBox="0 0 24 24" version="1.1">\n                                        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n                                            <polygon points="0 0 24 0 24 24 0 24"></polygon>\n                                            <path d="M6.70710678,15.7071068 C6.31658249,16.0976311 5.68341751,16.0976311 5.29289322,15.7071068 C4.90236893,15.3165825 4.90236893,14.6834175 5.29289322,14.2928932 L11.2928932,8.29289322 C11.6714722,7.91431428 12.2810586,7.90106866 12.6757246,8.26284586 L18.6757246,13.7628459 C19.0828436,14.1360383 19.1103465,14.7686056 18.7371541,15.1757246 C18.3639617,15.5828436 17.7313944,15.6103465 17.3242754,15.2371541 L12.0300757,10.3841378 L6.70710678,15.7071068 Z" fill="#000000" fill-rule="nonzero" transform="translate(12.000003, 11.999999) rotate(-180.000000) translate(-12.000003, -11.999999)"></path>\n                                        </g>\n                                    </svg>\n                                </span>\n                            </a>\n                            \x3c!--begin::Menu--\x3e\n                            <div class="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-bold fs-7 w-125px py-4" data-kt-menu="true">\n                                \x3c!--begin::Menu item--\x3e\n                                <div class="menu-item px-3">\n                                    <a href="#" class="menu-link px-3" data-kt-docs-table-filter="edit_row">\n                                        Edit\n                                    </a>\n                                </div>\n                                \x3c!--end::Menu item--\x3e\n                                \n                                \x3c!--begin::Menu item--\x3e\n                                <div class="menu-item px-3">\n                                    <a href="#" class="menu-link px-3" data-kt-docs-table-filter="delete_row">\n                                        Delete\n                                    </a>\n                                </div>\n                                \x3c!--end::Menu item--\x3e\n                            </div>\n                            \x3c!--end::Menu--\x3e\n                        ';
            },
          },
        ],
        createdRow: function (e, t, n) {
          $(e).find("td:eq(4)").attr("data-filter", t.CreditCardType);
        },
      })),
        e.$,
        e.on("draw", function () {
          o(), a(), n(), KTMenu.createInstances();
        }),
        document
          .querySelector('[data-kt-docs-table-filter="search"]')
          .addEventListener("keyup", function (t) {
            e.search(t.target.value).draw();
          }),
        o(),
        (t = document.querySelectorAll(
          '[data-kt-docs-table-filter="payment_type"] [name="payment_type"]'
        )),
        document
          .querySelector('[data-kt-docs-table-filter="filter"]')
          .addEventListener("click", function () {
            let n = "";
            t.forEach((e) => {
              e.checked && (n = e.value), "all" === n && (n = "");
            }),
              e.search(n).draw();
          }),
        n(),
        document
          .querySelector('[data-kt-docs-table-filter="reset"]')
          .addEventListener("click", function () {
            (t[0].checked = !0), e.search("").draw();
          });
    },
  };
})();
KTUtil.onDOMContentLoaded(function () {
  KTDatatablesServerSide.init();
});
