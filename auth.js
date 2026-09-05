(function () {

  "use strict";

  /* =========================================================
     GROVA DOCUMENT
     FIREBASE AUTHENTICATION
     ========================================================= */

  var firebaseConfig = {

    apiKey:
      "AIzaSyBcqgrkL64utUMwyZz9wmb_cM0gA5Hy8II",

    authDomain:
      "grova-document.firebaseapp.com",

    projectId:
      "grova-document",

    storageBucket:
      "grova-document.firebasestorage.app",

    messagingSenderId:
      "220105094085",

    appId:
      "1:220105094085:web:5a7263b0653333baed51ac",

    measurementId:
      "G-TNVNP286G4"

  };


  /* =========================================================
     FIREBASE INIT
     ========================================================= */

  if (
    typeof firebase === "undefined"
  ) {

    showFatalError(
      "Không thể tải Firebase Authentication. " +
      "Hãy kiểm tra kết nối Internet rồi thử lại."
    );

    return;

  }


  var firebaseApp;

  try {

    firebaseApp =
      firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(
            firebaseConfig
          );

  } catch (error) {

    console.error(
      "Firebase initialization error:",
      error
    );

    showFatalError(
      "Không thể khởi tạo hệ thống đăng nhập GROVA."
    );

    return;

  }


  var auth =
    firebaseApp.auth();


  /*
   * Giữ phiên đăng nhập trên thiết bị.
   * Firebase mặc định cũng dùng LOCAL,
   * nhưng đặt rõ ràng để hành vi ổn định.
   */

  auth.setPersistence(
    firebase.auth.Auth.Persistence.LOCAL
  ).catch(function (error) {

    console.warn(
      "Không thể thiết lập phiên đăng nhập LOCAL.",
      error
    );

  });


  /* =========================================================
     DOM
     ========================================================= */

  function $(selector) {

    return document.querySelector(
      selector
    );

  }


  /* =========================================================
     LOGIN UI
     ========================================================= */

  function createAuthOverlay() {

    if (
      document.getElementById(
        "grovaAuthOverlay"
      )
    ) {
      return;
    }


    var overlay =
      document.createElement("div");

    overlay.id =
      "grovaAuthOverlay";

    overlay.setAttribute(
      "aria-hidden",
      "true"
    );


    overlay.innerHTML =

      '<div class="grova-auth-card">' +

        '<div class="grova-auth-brand">' +

          '<img ' +
            'src="./data/grova_logo.png" ' +
            'alt="GROVA HOLDINGS" ' +
            'class="grova-auth-logo">' +

          '<span class="grova-auth-eyebrow">' +
            'GROVA HOLDINGS' +
          '</span>' +

          '<h1 class="grova-auth-title">' +
            'GROVA DOCUMENT' +
          '</h1>' +

          '<p class="grova-auth-subtitle">' +
            'Đăng nhập để sử dụng hệ thống quản lý hồ sơ' +
          '</p>' +

        '</div>' +


        '<form ' +
          'id="grovaLoginForm" ' +
          'class="grova-auth-form" ' +
          'autocomplete="on">' +


          '<div class="grova-auth-field">' +

            '<label for="grovaLoginEmail">' +
              'Email' +
            '</label>' +

            '<input ' +
              'id="grovaLoginEmail" ' +
              'name="email" ' +
              'type="email" ' +
              'inputmode="email" ' +
              'autocomplete="username" ' +
              'placeholder="Nhập email của bạn" ' +
              'required>' +

          '</div>' +


          '<div class="grova-auth-field">' +

            '<label for="grovaLoginPassword">' +
              'Mật khẩu' +
            '</label>' +

            '<div class="grova-auth-password-row">' +

              '<input ' +
                'id="grovaLoginPassword" ' +
                'name="password" ' +
                'type="password" ' +
                'autocomplete="current-password" ' +
                'placeholder="Nhập mật khẩu" ' +
                'required>' +

              '<button ' +
                'type="button" ' +
                'id="grovaTogglePassword" ' +
                'class="grova-auth-toggle-password" ' +
                'aria-label="Hiện mật khẩu">' +
                '◉' +
              '</button>' +

            '</div>' +

          '</div>' +


          '<p ' +
            'id="grovaAuthMessage" ' +
            'class="grova-auth-message" ' +
            'aria-live="polite">' +
          '</p>' +


          '<button ' +
            'type="submit" ' +
            'id="grovaLoginButton" ' +
            'class="grova-auth-submit">' +
            'Đăng nhập' +
          '</button>' +


          '<button ' +
            'type="button" ' +
            'id="grovaForgotPassword" ' +
            'class="grova-auth-forgot">' +
            'Quên mật khẩu?' +
          '</button>' +

        '</form>' +


        '<div class="grova-auth-footer">' +

          '<strong>GROVA DOCUMENT</strong>' +
          '<br>' +
          'Hệ thống quản lý hồ sơ và văn bản' +

        '</div>' +

      '</div>';


    document.body.insertBefore(
      overlay,
      document.body.firstChild
    );


    bindAuthEvents();

  }


  /* =========================================================
     AUTH EVENTS
     ========================================================= */

  function bindAuthEvents() {

    var form =
      $("#grovaLoginForm");

    var toggle =
      $("#grovaTogglePassword");

    var forgot =
      $("#grovaForgotPassword");


    if (form) {

      form.addEventListener(
        "submit",
        handleLogin
      );

    }


    if (toggle) {

      toggle.addEventListener(
        "click",
        function () {

          var password =
            $("#grovaLoginPassword");

          if (!password) {
            return;
          }

          if (
            password.type === "password"
          ) {

            password.type =
              "text";

            toggle.textContent =
              "◉";

            toggle.setAttribute(
              "aria-label",
              "Ẩn mật khẩu"
            );

          } else {

            password.type =
              "password";

            toggle.textContent =
              "◉";

            toggle.setAttribute(
              "aria-label",
              "Hiện mật khẩu"
            );

          }

        }
      );

    }


    if (forgot) {

      forgot.addEventListener(
        "click",
        handleForgotPassword
      );

    }

  }


  /* =========================================================
     LOGIN
     ========================================================= */

  function handleLogin(event) {

    event.preventDefault();


    var emailInput =
      $("#grovaLoginEmail");

    var passwordInput =
      $("#grovaLoginPassword");

    var button =
      $("#grovaLoginButton");


    if (
      !emailInput ||
      !passwordInput ||
      !button
    ) {
      return;
    }


    var email =
      emailInput.value
        .trim()
        .toLowerCase();

    var password =
      passwordInput.value;


    if (!email || !password) {

      setMessage(
        "Vui lòng nhập email và mật khẩu.",
        "error"
      );

      return;

    }


    setLoading(
      true
    );


    auth
      .signInWithEmailAndPassword(
        email,
        password
      )

      .then(function () {

        setMessage(
          "Đăng nhập thành công.",
          "success"
        );

      })

      .catch(function (error) {

        console.error(
          "Firebase login error:",
          error
        );

        setMessage(
          getAuthErrorMessage(
            error
          ),
          "error"
        );

        setLoading(
          false
        );

      });

  }


  /* =========================================================
     FORGOT PASSWORD
     ========================================================= */

  function handleForgotPassword() {

    var emailInput =
      $("#grovaLoginEmail");

    if (!emailInput) {
      return;
    }


    var email =
      emailInput.value
        .trim()
        .toLowerCase();


    if (!email) {

      setMessage(
        "Hãy nhập email trước, sau đó chọn Quên mật khẩu.",
        "error"
      );

      emailInput.focus();

      return;

    }


    setMessage(
      "Đang gửi email đặt lại mật khẩu...",
      "success"
    );


    auth
      .sendPasswordResetEmail(
        email
      )

      .then(function () {

        setMessage(
          "Đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư của bạn.",
          "success"
        );

      })

      .catch(function (error) {

        console.error(
          "Password reset error:",
          error
        );

        setMessage(
          getAuthErrorMessage(
            error
          ),
          "error"
        );

      });

  }


  /* =========================================================
     AUTH STATE
     ========================================================= */

  function startAuthListener() {

    auth.onAuthStateChanged(
      function (user) {

        document.body.classList.remove(
          "auth-loading"
        );


        if (user) {

          showApplication(
            user
          );

        } else {

          showLogin();

        }

      }
    );

  }


  /* =========================================================
     SHOW APP
     ========================================================= */

  function showApplication(
    user
  ) {

    document.body.classList.remove(
      "auth-locked"
    );


    var overlay =
      $("#grovaAuthOverlay");

    if (overlay) {

      overlay.setAttribute(
        "aria-hidden",
        "true"
      );

      overlay.style.display =
        "none";

    }


    var shell =
      document.querySelector(
        ".app-shell"
      );

    if (shell) {

      shell.style.visibility =
        "visible";

    }


    updateUserInterface(
      user
    );

  }


  /* =========================================================
     SHOW LOGIN
     ========================================================= */

  function showLogin() {

    document.body.classList.add(
      "auth-locked"
    );


    var overlay =
      $("#grovaAuthOverlay");

    if (!overlay) {

      createAuthOverlay();

      overlay =
        $("#grovaAuthOverlay");

    }


    if (overlay) {

      overlay.style.display =
        "flex";

      overlay.setAttribute(
        "aria-hidden",
        "false"
      );

    }


    var shell =
      document.querySelector(
        ".app-shell"
      );

    if (shell) {

      shell.style.visibility =
        "hidden";

    }


    var emailInput =
      $("#grovaLoginEmail");

    if (emailInput) {

      setTimeout(
        function () {
          emailInput.focus();
        },
        150
      );

    }

  }


  /* =========================================================
     UPDATE USER UI
     ========================================================= */

  function updateUserInterface(
    user
  ) {

    var email =
      user.email ||
      "Tài khoản GROVA";


    var displayName =
      user.displayName ||
      email;


    var firstLetter =
      (
        displayName
          .charAt(0) ||
        "G"
      ).toUpperCase();


    var name =
      document.getElementById(
        "currentUserName"
      );

    var role =
      document.getElementById(
        "currentUserRole"
      );

    var avatar =
      document.querySelector(
        ".user-avatar"
      );


    if (name) {

      name.textContent =
        displayName;

    }


    if (role) {

      role.textContent =
        email;

    }


    if (avatar) {

      avatar.textContent =
        firstLetter;

    }


    addLogoutButton();

  }


  /* =========================================================
     LOGOUT
     ========================================================= */

  function addLogoutButton() {

    if (
      document.getElementById(
        "grovaLogoutButton"
      )
    ) {
      return;
    }


    var topbarUser =
      document.querySelector(
        ".topbar-user"
      );


    if (!topbarUser) {
      return;
    }


    var button =
      document.createElement(
        "button"
      );


    button.type =
      "button";

    button.id =
      "grovaLogoutButton";

    button.className =
      "grova-logout-button";

    button.textContent =
      "Đăng xuất";


    button.addEventListener(
      "click",
      function () {

        if (
          !window.confirm(
            "Bạn có chắc muốn đăng xuất khỏi GROVA DOCUMENT?"
          )
        ) {
          return;
        }


        auth
          .signOut()

          .catch(function (error) {

            console.error(
              "Logout error:",
              error
            );

            alert(
              "Không thể đăng xuất. Vui lòng thử lại."
            );

          });

      }
    );


    topbarUser.appendChild(
      button
    );

  }


  /* =========================================================
     LOADING
     ========================================================= */

  function setLoading(
    loading
  ) {

    var button =
      $("#grovaLoginButton");

    var email =
      $("#grovaLoginEmail");

    var password =
      $("#grovaLoginPassword");

    var forgot =
      $("#grovaForgotPassword");


    if (button) {

      button.disabled =
        loading;

      button.textContent =
        loading
          ? "Đang đăng nhập..."
          : "Đăng nhập";

    }


    if (email) {

      email.disabled =
        loading;

    }


    if (password) {

      password.disabled =
        loading;

    }


    if (forgot) {

      forgot.disabled =
        loading;

    }

  }


  /* =========================================================
     MESSAGE
     ========================================================= */

  function setMessage(
    message,
    type
  ) {

    var element =
      $("#grovaAuthMessage");


    if (!element) {
      return;
    }


    element.textContent =
      message || "";


    element.className =
      "grova-auth-message";


    if (type) {

      element.classList.add(
        type
      );

    }

  }


  /* =========================================================
     FIREBASE ERROR MESSAGES
     ========================================================= */

  function getAuthErrorMessage(
    error
  ) {

    var code =
      error &&
      error.code
        ? error.code
        : "";


    switch (code) {

      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":

        return (
          "Email hoặc mật khẩu không đúng."
        );


      case "auth/invalid-email":

        return (
          "Địa chỉ email không hợp lệ."
        );


      case "auth/user-disabled":

        return (
          "Tài khoản này đã bị vô hiệu hóa."
        );


      case "auth/too-many-requests":

        return (
          "Có quá nhiều lần thử đăng nhập. " +
          "Vui lòng chờ một lúc rồi thử lại."
        );


      case "auth/network-request-failed":

        return (
          "Không thể kết nối Firebase. " +
          "Hãy kiểm tra Internet."
        );


      case "auth/unauthorized-domain":

        return (
          "Tên miền GROVA chưa được Firebase cho phép. " +
          "Hãy thêm tên miền GitHub Pages vào Authorized domains."
        );


      case "auth/operation-not-allowed":

        return (
          "Phương thức Email/Password chưa được bật trong Firebase."
        );


      default:

        return (
          "Không thể đăng nhập. " +
          "Vui lòng kiểm tra thông tin và thử lại."
        );

    }

  }


  /* =========================================================
     FATAL ERROR
     ========================================================= */

  function showFatalError(
    message
  ) {

    document.body.classList.remove(
      "auth-loading"
    );


    var overlay =
      document.createElement(
        "div"
      );


    overlay.id =
      "grovaAuthOverlay";


    overlay.innerHTML =

      '<div class="grova-auth-card">' +

        '<div class="grova-auth-brand">' +

          '<img ' +
            'src="./data/grova_logo.png" ' +
            'alt="GROVA" ' +
            'class="grova-auth-logo">' +

          '<span class="grova-auth-eyebrow">' +
            'GROVA HOLDINGS' +
          '</span>' +

          '<h1 class="grova-auth-title">' +
            'GROVA DOCUMENT' +
          '</h1>' +

        '</div>' +

        '<div class="grova-auth-error-box">' +
          message +
        '</div>' +

      '</div>';


    document.body.insertBefore(
      overlay,
      document.body.firstChild
    );

  }


  /* =========================================================
     INIT
     ========================================================= */

  function init() {

    document.body.classList.add(
      "auth-loading"
    );


    createAuthOverlay();


    startAuthListener();

  }


  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }


  /* =========================================================
     PUBLIC AUTH API
     ========================================================= */

  window.GROVA_AUTH = {

    auth:
      auth,

    firebase:
      firebaseApp,

    signOut:
      function () {
        return auth.signOut();
      },

    getCurrentUser:
      function () {
        return auth.currentUser;
      }

  };

})();