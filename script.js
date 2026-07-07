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


// ==============================
// データ
// ==============================

let wishes = [];

let sortMode = "new";


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
// 短冊表示
// ==============================

function render() {
  const data = [...wishes].sort((a, b) => {
    if (sortMode === "likes") {
      return (b.likes || 0) - (a.likes || 0);
    }

    return (b.createdMs || 0) - (a.createdMs || 0);
  });


  // 総いいね数

  if (totalLikes) {
    totalLikes.textContent = wishes
      .reduce(
        (total, wish) => total + (wish.likes || 0),
        0
      )
      .toLocaleString("ja-JP");
  }


  // 願いがない場合

  if (!data.length) {
    carousel.innerHTML = `
      <div class="empty">
        まだ願い事がありません。<br>
        最初の短冊を書いてみよう。
      </div>
    `;

    return;
  }


  // 短冊生成

  carousel.innerHTML = data
    .map(wish => {
      const liked =
        localStorage.getItem(
          likedKey(wish.id)
        ) === "1";

      const name = escapeHtml(wish.name || "");

      const grade = escapeHtml(wish.grade || "");

      const wishText = escapeHtml(wish.wish || "").trim();

      return `
        <article class="wish-card">
          <h3>${name}</h3>
          <span class="grade">${grade}</span>
          <div class="wish-text">${wishText}</div>
          <button
            class="like ${liked ? "liked" : ""}"
            data-id="${wish.id}"
            ${liked ? "disabled" : ""}
          >♥ ${wish.likes || 0}</button>
        </article>
      `;
    })
    .join("");
}


// ==============================
// Firebase リアルタイム取得
// ==============================

onSnapshot(
  wishesRef,

  snapshot => {
    wishes = snapshot.docs.map(document => {
      const data = document.data();

      return {
        id: document.id,

        ...data,

        createdMs:
          data.createdAt?.toMillis?.() || 0
      };
    });


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


    const id = button.dataset.id;


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
          likes: increment(1)
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


      button.disabled = false;


      alert(
        "いいねに失敗しました"
      );
    }
  }
);


// ==============================
// 願い投稿
// ==============================

form.addEventListener(
  "submit",

  async event => {
    event.preventDefault();


    const nameInput =
      document.querySelector("#name");

    const gradeInput =
      document.querySelector("#grade");

    const wishInput =
      document.querySelector("#wish");


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
      const result = await addDoc(
        wishesRef,

        {
          name: name,

          grade: grade,

          wish: wish,

          likes: 0,

          createdAt: serverTimestamp()
        }
      );


      console.log(
        "投稿成功",
        result.id
      );


      form.reset();


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


// ==============================
// 並び替え
// ==============================

document
  .querySelectorAll(".sort button")
  .forEach(button => {
    button.addEventListener(
      "click",

      () => {
        document
          .querySelectorAll(".sort button")
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


        render();
      }
    );
  });


// ==============================
// 左スクロール
// ==============================

if (prevButton) {
  prevButton.addEventListener(
    "click",

    () => {
      carousel.scrollBy({
        left: -284,

        behavior: "smooth"
      });
    }
  );
}


// ==============================
// 右スクロール
// ==============================

if (nextButton) {
  nextButton.addEventListener(
    "click",

    () => {
      carousel.scrollBy({
        left: 284,

        behavior: "smooth"
      });
    }
  );
}
