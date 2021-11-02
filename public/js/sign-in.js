var xhr = new XMLHttpRequest();
xhr.open("POST", "/tokensignin", true);
xhr.setRequestHeader("Content-Type", "application/json");

function onSignIn(googleUser) {
  var profile = googleUser.getBasicProfile();
  console.log("ID: " + profile.getId()); // Do not send to your backend! Use an ID token instead.
  console.log("Token: ", googleUser.getAuthResponse()); // Do not send to your backend! Use an ID token instead.
  console.log("Name: " + profile.getName());
  console.log("Image URL: " + profile.getImageUrl());
  console.log("Email: " + profile.getEmail()); // This is null if the 'email' scope is not present.

  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      location.reload();
    } else {
      console.log(xhr.responseText);
    }
  };

  xhr.send(JSON.stringify({ id_token: googleUser.getAuthResponse().id_token }));
}

var startApp = function () {
  gapi.load("auth2", function () {
    auth2 = gapi.auth2.init({
      client_id:
        "589100687475-a5os5k6fob930dm7ns7fvmar32p71qrp.apps.googleusercontent.com",
      cookiepolicy: "single_host_origin",
    });
    attachSignin();
  });
};

function attachSignin() {
  auth2.attachClickHandler(
    document.getElementById("my-signin2"),
    {},
    onSignIn,
    function (error) {
      alert(JSON.stringify(error, undefined, 2));
    }
  );
}

startApp();
