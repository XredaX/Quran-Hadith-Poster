chrome.runtime.sendMessage({ type: "INIT_SET_COOKIE" }, function (e) {
  localStorage.setItem("fewfeed", JSON.stringify({ cookie: e, version: 17 }))
})
function e(e) {
  return new Promise((t) => {
    if (document.querySelector(e)) {
      return t(document.querySelector(e))
    }
    const n = new MutationObserver((n) => {
      if (document.querySelector(e)) {
        t(document.querySelector(e))
      }
    })
    n.observe(document.body, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    })
  })
}
e("#fewfeed-set-anon").then((e) => {
  console.log(8888)
  e.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "SET_ANONYMOUS" }, function (e) {
      console.log(9999)
    })
  })
})
e("#fewfeed-add-login").then((e) => {
  e.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "LOGIN_NEW_ACC" }, function (e) {})
  })
})
e("#fewfeed-reels-wipe").then((e) => {
  e.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "WIPE_REELS", body: {} }, function (t) {
      e.value = t
      const n = new Event("keyup", { bubbles: true, cancelable: false })
      e.dispatchEvent(n)
    })
  })
})
e("#fewfeed-accounts-add").then((e) => {
  e.addEventListener("click", () => {
    chrome.runtime.sendMessage(
      { type: "SET_MULTIPLE_HEADER", body: e.value },
      function (t) {
        e.value = t
        const n = new Event("keyup", { bubbles: true, cancelable: false })
        e.dispatchEvent(n)
      }
    )
  })
})
e("#fewfeed-reel-add").then((e) => {
  e.addEventListener("click", () => {
    chrome.runtime.sendMessage(
      { type: "SET_REEL_DATA", body: e.value },
      function (t) {
        e.value = t
        const n = new Event("keyup", { bubbles: true, cancelable: false })
        e.dispatchEvent(n)
      }
    )
  })
})
e("#fewfeed-cookie-add").then((e) => {
  e.addEventListener("click", () => {})
})
e("#fewfeed-click").then((e) => {
  e.addEventListener("click", () => {
    chrome.runtime.sendMessage(
      {
        type: "SET_RAW_COOKIE",
        body: localStorage.getItem("main_cookie") || {},
      },
      function (t) {
        e.value = t
        localStorage.setItem(
          "fewfeed",
          JSON.stringify({ cookie: t, version: 2 })
        )
        const n = new Event("keyup", { bubbles: true, cancelable: false })
        e.dispatchEvent(n)
      }
    )
  })
})
