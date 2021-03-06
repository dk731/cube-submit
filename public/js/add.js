"use strict";

var drop_zone = new Dropzone("#kt_dropzonejs_example_1", {
  url: "/upload_job", // Set the url for your upload script location
  //   paramName: "file", // The name that will be used to transfer the file
  method: "post",
  maxFiles: 5,
  maxFilesize: 3, // MB
  addRemoveLinks: true,
  autoProcessQueue: false,
  uploadMultiple: true,
  parallelUploads: 5,
});

drop_zone.on("sending", function (data, xhr, formData) {
  if (!formData.has("note")) formData.append("note", document.getElementById("note_input").value);
});

// Class definition
var KTModalCustomersAdd = (function () {
  var submitButton;
  var cancelButton;
  var closeButton;
  var form_validator;
  var files_validator;
  var form;
  var modal;

  // Init form inputs
  var handleForm = function () {
    // Init form validation rules. For more info check the FormValidation plugin's official documentation:https://formvalidation.io/
    form_validator = FormValidation.formValidation(form, {
      fields: {
        note: {
          validators: {
            callback: {
              callback: function (input) {
                return input.value.length >= 5 && input.value.length <= 25;
              },
              message: "Please provide some information about your submit (min: 5, max: 25 characters)",
            },
          },
        },
        files_upload: {
          validators: {
            callback: {
              callback: function (input) {
                const main_file = drop_zone.files.find((file) => file.name == "main.py");
                if (!main_file)
                  return {
                    valid: false,
                    message: "Please select your main.py",
                  };

                if (main_file.size == 0)
                  return {
                    valid: false,
                    message: "Selected main.py file is empty",
                  };

                if (drop_zone.files.length > 5) return { valid: false, message: "Max amount of files is 5!" };

                return true;
              },
              message: "Please select at least one python file",
            },
          },
        },
      },
      plugins: {
        trigger: new FormValidation.plugins.Trigger(),
        bootstrap: new FormValidation.plugins.Bootstrap5({
          rowSelector: ".fv-row",
          eleInvalidClass: "",
          eleValidClass: "",
        }),
      },
    });

    submitButton.addEventListener("click", function (e) {
      e.preventDefault();

      // Validate form before submit

      form_validator.validate().then(function (status) {
        if (status == "Valid") {
          submitButton.setAttribute("data-kt-indicator", "on");
          submitButton.disabled = true;

          drop_zone.processQueue();
        }
      });
    });

    cancelButton.addEventListener("click", function (e) {
      e.preventDefault();

      form.reset(); // Reset form
      modal.hide(); // Hide modal
    });

    closeButton.addEventListener("click", function (e) {
      e.preventDefault();

      form.reset(); // Reset form
      modal.hide(); // Hide modal
    });

    drop_zone.on("error", function (file, ret) {
      console.log(ret);
      if (ret.includes("Server"))
        Swal.fire({
          text: "Error occured during file upload, try again later",
          icon: "error",
          buttonsStyling: false,
          confirmButtonText: "Ok",
          customClass: {
            confirmButton: "btn btn-primary",
          },
        }).then(function (result) {
          submitButton.setAttribute("data-kt-indicator", "off");
          drop_zone.removeAllFiles();
          submitButton.disabled = false;
          modal.hide();

          form.reset();
          modal.hide();
        });
    });

    drop_zone.on("successmultiple", function (file, ret) {
      var swal_text, swal_icon;
      if (JSON.parse(ret).success) {
        swal_icon = "success";
        swal_text = "Successfully uploaded files, your job should apper in main jobs list soon!";
        dt.ajax.reload(null, false);
      } else {
        swal_icon = "warning";
        swal_text = "Server responded with error, try again later";
      }

      Swal.fire({
        text: swal_text,
        icon: swal_icon,
        buttonsStyling: false,
        confirmButtonText: "Ok",
        customClass: {
          confirmButton: "btn btn-primary",
        },
      }).then(function (result) {
        submitButton.setAttribute("data-kt-indicator", "off");
        drop_zone.removeAllFiles();
        submitButton.disabled = false;
        modal.hide();

        form.reset();
        modal.hide();
      });
    });

  };

  return {
    init: function () {
      // Elements
      modal = new bootstrap.Modal(document.querySelector("#kt_modal_add_customer"));

      form = document.querySelector("#kt_modal_add_customer_form");
      submitButton = form.querySelector("#kt_modal_add_customer_submit");
      cancelButton = form.querySelector("#kt_modal_add_customer_cancel");
      closeButton = form.querySelector("#kt_modal_add_customer_close");

      handleForm();
    },
  };
})();

// On document ready
KTUtil.onDOMContentLoaded(function () {
  KTModalCustomersAdd.init();
});
