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
  if (!formData.has("note"))
    formData.append("note", document.getElementById("note_input").value);
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
            notEmpty: {
              message: "Please provide some information about your submit",
            },
          },
        },
        files_upload: {
          validators: {
            callback: {
              callback: function (input) {
                const main_file = drop_zone.files.find(
                  (file) => file.name == "main.py"
                );
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

    drop_zone.on("error", function (file, ret) {
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
        swal_text =
          "Successfully uploaded files, your job should apper in main jobs list soon!";
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

    // drop_zone.on("sending", function (data, xhr, formData) {
    //   if (!formData.has("note"))
    //     formData.append("note", document.getElementById("note_input").value);
    // });

    // drop_zone.on("success", function (ret) {
    //   console.log("Successfully uploaded", ret);
    // });

    // drop_zone.on("error", function (file, ret) {
    //   console.log("Error during uploading", file, ret);
    // });

    // drop_zone.on("successmultiple", function (file, ret) {
    //   console.log("Success multiple", file, ret);
    // });

    // myDropzone.on("complete", function (ret) {
    //   console.log(ret);
    // });
  };

  return {
    init: function () {
      // Elements
      modal = new bootstrap.Modal(
        document.querySelector("#kt_modal_add_customer")
      );

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

// Swal.fire({
//   text: "Form has been successfully submitted!",
//   icon: "success",
//   buttonsStyling: false,
//   confirmButtonText: "Ok, got it!",
//   customClass: {
//     confirmButton: "btn btn-primary",
//   },
// }).then(function (result) {
//   if (result.isConfirmed) {
//     // Hide modal
//     modal.hide();

//     // Enable submit button after loading
//     submitButton.disabled = false;

//     // Redirect to customers list page
//     window.location = form.getAttribute("data-kt-redirect");
//   }
// });
