//////////////////////////////////////////// GOOGLE
function auth_google(usr) {
  var profile = usr.getBasicProfile();
  console.log("ID: " + profile.getId()); // Do not send to your backend! Use an ID token instead.
  console.log("Token: ", usr.getAuthResponse()); // Do not send to your backend! Use an ID token instead.
  console.log("Name: " + profile.getName());
  console.log("Image URL: " + profile.getImageUrl());
  console.log("Email: " + profile.getEmail()); // This is null if the 'email' scope is not present.

  window.location.replace(
    "/tokensignin?" +
      new URLSearchParams({
        id_token: usr.getAuthResponse().id_token,
        in_type: "google",
      }).toString()
  );
}

function attach_google() {
  auth2.attachClickHandler(document.getElementById("google_btn"), {}, auth_google, function (error) {
    alert(JSON.stringify(error, undefined, 2));
  });
}
////////////////////////////////////////////

//////////////////////////////////////////// GITHUB
function auth_github() {
  const random_str = get_random_string();
  const github_url = `https://github.com/login/oauth/authorize?client_id=e770e6440fbaac8200a7&redirect_uri=https://trycubic.com/tokensignin&state=${random_str}&rememb_value=${random_str}`;
  window.location.replace("/tokensignin?inst_redir=" + github_url);
}

//////////////////////////////////////////// FACEBOOK

function auth_facebook() {
  // const stringifiedParams = queryString.stringify({
  //   client_id: process.env.APP_ID_GOES_HERE,
  //   redirect_uri: 'https://www.example.com/authenticate/facebook/',
  //   scope: ['email', 'user_friends'].join(','), // comma seperated string
  //   response_type: 'code',
  //   auth_type: 'rerequest',
  //   display: 'popup',
  // });
  const facebookLoginUrl = `https://www.facebook.com/v4.0/dialog/oauth?`;
}

////////////////////////////////////////////

var start_buttons = function () {
  gapi.load("auth2", function () {
    // google
    auth2 = gapi.auth2.init({
      client_id: "589100687475-a5os5k6fob930dm7ns7fvmar32p71qrp.apps.googleusercontent.com",
      cookiepolicy: "single_host_origin",
    });
    attach_google();
  });

  document //github
    .getElementById("github_btn")
    .addEventListener("click", function () {
      auth_github();
    });

  // document //facebook
  //   .getElementById("facebook_btn")
  //   .addEventListener("click", function () {
  //     auth_facebook();
  //   });
};

start_buttons();

function get_random_string() {
  return Array(35)
    .fill()
    .map(() => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.random() * 62))
    .join("");
}
