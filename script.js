// ==============================
// Firebase 読み込み
// ==============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// ==============================
// Firebase 設定
// ==============================

const firebaseConfig = {
  apiKey: "AIzaSyDsRu7HzIl2_u334EfTrOCPqaIlphgXtZw",
  authDomain: "nijigaku-tanabata.firebaseapp.com",
  projectId: "nijigaku-tanabata",
  storageBucket: "nijigaku-tanabata.firebasestorage.app",
  messagingSenderId: "959354845309",
  appId: "1:959354845309:web:109ac828f5a9631f89d914",
  measurementId: "G-7M0L137SGH"
};


// ==============================
// Firebase 起動
// ==============================

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const wishesRef = collection(db, "wishes");


// ==============================
// HTML取得
// ==============================

const carousel = document.querySelector("#carousel");

const totalLikes = document.querySelector("#totalLikes");

const form = document.querySelector("#wishForm");

const status = document.querySelector("#status");

const prevButton = document.querySelector("#prev");

const nextButton = document.querySelector("#next");

const formCard = document.querySelector(".form-card");


// ==============================
// 七夕企画 終了日時
// 2026年7月8日 23:59 日本時間
// ==============================

const EVENT_END_TIME =
  new Date("2026-07-08T23:59:00+09:00").getTime();


// ==============================
// データ
// ==============================

let wishes = [];

let sortMode = "new";

let currentIndex = 0;


// ==============================
// 企画終了判定
// ==============================

function isEventEnded() {
  return Date.now() >= EVENT_END_TIME;
}


// ==============================
// 投稿フォーム表示切り替え
// ==============================

function updateEventStatus() {
  if (!formCard) {
    return;
  }


  if (!isEventEnded()) {
    return;
  }


  formCard.innerHTML = `
    <div class="event-ended">
      <div class="event-ended-icon">🎋</div>

      <h2>七夕企画は終了しました</h2>

      <p>
        たくさんの願いごとを<br>
        ありがとうございました。
      </p>

      <p class="event-ended-small">
        短冊は引き続き閲覧できます。<br>
        気になる願いには ♥ を送れます。
      </p>
    </div>
  `;
}


// ==============================
// 終了時間の自動監視
// ==============================

function startEventTimer() {
  updateEventStatus();


  if (isEventEnded()) {
    return;
  }


  const remainingTime =
    EVENT_END_TIME - Date.now();


  setTimeout(() => {
    updateEventStatus();
  }, remainingTime + 1000);
}


// ==============================
// いいね済み保存キー
// ==============================

function likedKey(id) {
  return `tanabata-liked-${id}`;
}


// ==============================
// HTML安全処理
// ==============================

function escapeHtml(value = "") {
  const div = document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}


// ==============================
// 表示用データ取得
// ==============================

function getSortedWishes() {
  return [...wishes].sort((a, b) => {
    if (sortMode === "likes") {
      return (b.likes || 0) - (a.likes || 0);
    }


    return (b.createdMs || 0) - (a.createdMs || 0);
  });
}


// ==============================
// 短冊表示
// ==============================

function render() {
  const data = getSortedWishes();


  // 総いいね数

  if (totalLikes) {
    totalLikes.textContent = wishes
      .reduce(
        (total, wish) =>
          total + (wish.likes || 0),

        0
      )
      .toLocaleString("ja-JP");
  }


  // 願いがない場合

  if (!data.length) {
    carousel.innerHTML = `
      <div class="empty">
        まだ願い事がありません。
      </div>
    `;

    return;
  }


  // 現在位置調整

  if (currentIndex >= data.length) {
    currentIndex = 0;
  }


  // 短冊生成

  carousel.innerHTML = data
    .map(wish => {
      const liked =
        localStorage.getItem(
          likedKey(wish.id)
        ) === "1";


      const name =
        escapeHtml(wish.name || "");


      const grade =
        escapeHtml(wish.grade || "");


      const wishText =
        escapeHtml(
          wish.wish || ""
        ).trim();


      return `
        <article class="wish-card">

          <h3>
            ${name}
          </h3>

          <span class="grade">
            ${grade}
          </span>

          <div class="wish-text">
            ${wishText}
          </div>

          <button
            class="like ${liked ? "liked" : ""}"
            data-id="${wish.id}"
            ${liked ? "disabled" : ""}
          >
            ♥ ${wish.likes || 0}
          </button>

        </article>
      `;
    })
    .join("");


  requestAnimationFrame(() => {
    scrollToCurrent(false);
  });
}


// ==============================
// 現在の短冊へ移動
// ==============================

function scrollToCurrent(smooth = true) {
  const cards =
    carousel.querySelectorAll(
      ".wish-card"
    );


  if (!cards.length) {
    return;
  }


  const card =
    cards[currentIndex];


  if (!card) {
    return;
  }


  card.scrollIntoView({
    behavior:
      smooth
        ? "smooth"
        : "auto",

    inline:
      "center",

    block:
      "nearest"
  });
}


// ==============================
// 次の短冊
// ==============================

function goNext() {
  const data =
    getSortedWishes();


  if (!data.length) {
    return;
  }


  currentIndex++;


  if (
    currentIndex >= data.length
  ) {
    currentIndex = 0;
  }


  scrollToCurrent(true);
}


// ==============================
// 前の短冊
// ==============================

function goPrev() {
  const data =
    getSortedWishes();


  if (!data.length) {
    return;
  }


  currentIndex--;


  if (currentIndex < 0) {
    currentIndex =
      data.length - 1;
  }


  scrollToCurrent(true);
}


// ==============================
// スワイプ位置検出
// ==============================

let scrollTimer = null;


carousel.addEventListener(
  "scroll",

  () => {
    clearTimeout(scrollTimer);


    scrollTimer =
      setTimeout(() => {
        const cards = [
          ...carousel.querySelectorAll(
            ".wish-card"
          )
        ];


        if (!cards.length) {
          return;
        }


        const carouselCenter =
          carousel.scrollLeft +
          carousel.clientWidth / 2;


        let closestIndex = 0;

        let closestDistance =
          Infinity;


        cards.forEach(
          (card, index) => {
            const cardCenter =
              card.offsetLeft +
              card.offsetWidth / 2;


            const distance =
              Math.abs(
                carouselCenter -
                cardCenter
              );


            if (
              distance <
              closestDistance
            ) {
              closestDistance =
                distance;


              closestIndex =
                index;
            }
          }
        );


        currentIndex =
          closestIndex;


        if (
          currentIndex ===
            cards.length - 1 &&

          carousel.scrollLeft +
            carousel.clientWidth >=
            carousel.scrollWidth - 5
        ) {
          setTimeout(() => {
            currentIndex = 0;

            scrollToCurrent(false);
          }, 250);
        }

      }, 150);
  }
);


// ==============================
// Firebase リアルタイム取得
// ==============================

onSnapshot(
  wishesRef,

  snapshot => {
    wishes =
      snapshot.docs.map(
        document => {
          const data =
            document.data();


          return {
            id: document.id,

            ...data,

            createdMs:
              data.createdAt
                ?.toMillis?.() || 0
          };
        }
      );


    console.log(
      "願い取得成功",
      wishes
    );


    render();
  },


  error => {
    console.error(
      "Firebase取得エラー",
      error
    );


    carousel.innerHTML = `
      <div class="empty">
        Firebaseへの接続に失敗しました。<br>
        ${escapeHtml(error.message)}
      </div>
    `;
  }
);


// ==============================
// いいね
// 終了後も使用可能
// ==============================

carousel.addEventListener(
  "click",

  async event => {
    const button =
      event.target.closest(".like");


    if (
      !button ||
      button.disabled
    ) {
      return;
    }


    const id =
      button.dataset.id;


    button.disabled = true;


    localStorage.setItem(
      likedKey(id),
      "1"
    );


    try {
      await updateDoc(
        doc(
          db,
          "wishes",
          id
        ),

        {
          likes:
            increment(1)
        }
      );
    }


    catch (error) {
      console.error(
        "いいねエラー",
        error
      );


      localStorage.removeItem(
        likedKey(id)
      );


      button.disabled =
        false;


      alert(
        "いいねに失敗しました"
      );
    }
  }
);


// ==============================
// 願い投稿
// ==============================

if (form) {
  form.addEventListener(
    "submit",

    async event => {
      event.preventDefault();


      // 終了後は投稿不可

      if (isEventEnded()) {
        updateEventStatus();

        return;
      }


      const nameInput =
        document.querySelector(
          "#name"
        );


      const gradeInput =
        document.querySelector(
          "#grade"
        );


      const wishInput =
        document.querySelector(
          "#wish"
        );


      const name =
        nameInput.value.trim();


      const grade =
        gradeInput.value;


      const wish =
        wishInput.value.trim();


      if (
        !name ||
        !grade ||
        !wish
      ) {
        status.textContent =
          "すべて入力してください。";


        return;
      }


      status.textContent =
        "投稿中…";


      try {
        const result =
          await addDoc(
            wishesRef,

            {
              name: name,

              grade: grade,

              wish: wish,

              likes: 0,

              createdAt:
                serverTimestamp()
            }
          );


        console.log(
          "投稿成功",
          result.id
        );


        form.reset();


        currentIndex = 0;


        status.textContent =
          "願い事を投稿しました ✨";
      }


      catch (error) {
        console.error(
          "投稿エラー",
          error
        );


        status.textContent =
          `投稿できませんでした：${error.message}`;
      }
    }
  );
}


// ==============================
// 並び替え
// ==============================

document
  .querySelectorAll(
    ".sort button"
  )
  .forEach(button => {
    button.addEventListener(
      "click",

      () => {
        document
          .querySelectorAll(
            ".sort button"
          )
          .forEach(item => {
            item.classList.remove(
              "active"
            );
          });


        button.classList.add(
          "active"
        );


        sortMode =
          button.dataset.sort;


        currentIndex = 0;


        render();
      }
    );
  });


// ==============================
// 左ボタン
// ==============================

if (prevButton) {
  prevButton.addEventListener(
    "click",

    goPrev
  );
}


// ==============================
// 右ボタン
// ==============================

if (nextButton) {
  nextButton.addEventListener(
    "click",

    goNext
  );
}


// ==============================
// 七夕企画終了タイマー開始
// ==============================

startEventTimer();
