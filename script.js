// Firebase設定を入力すると、全員で願い・いいねを共有できます。
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "ここにAPI_KEY",
  authDomain: "ここにAUTH_DOMAIN",
  projectId: "ここにPROJECT_ID",
  storageBucket: "ここにSTORAGE_BUCKET",
  messagingSenderId: "ここにMESSAGING_SENDER_ID",
  appId: "ここにAPP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const wishesRef = collection(db, "wishes");

const carousel = document.querySelector("#carousel");
const totalLikes = document.querySelector("#totalLikes");
const form = document.querySelector("#wishForm");
const status = document.querySelector("#status");
let wishes = [];
let sortMode = "new";

function likedKey(id){ return `tanabata-liked-${id}`; }

function render(){
  const data=[...wishes].sort((a,b)=>sortMode==="likes" ? (b.likes||0)-(a.likes||0) : (b.createdMs||0)-(a.createdMs||0));
  totalLikes.textContent=wishes.reduce((n,w)=>n+(w.likes||0),0).toLocaleString("ja-JP");
  if(!data.length){carousel.innerHTML='<div class="empty">まだ願い事がありません。<br>最初の短冊を書いてみよう。</div>';return;}
  carousel.innerHTML=data.map(w=>{
    const liked=localStorage.getItem(likedKey(w.id))==="1";
    return `<article class="wish-card">
      <h3>${escapeHtml(w.name)}</h3>
      <span class="grade">${escapeHtml(w.grade)}</span>
      <div class="wish-text">${escapeHtml(w.wish)}</div>
      <button class="like ${liked?"liked":""}" data-id="${w.id}" ${liked?"disabled":""}>♥ ${w.likes||0}</button>
    </article>`;
  }).join("");
}

function escapeHtml(v=""){const d=document.createElement("div");d.textContent=v;return d.innerHTML;}

onSnapshot(wishesRef, snap=>{
  wishes=snap.docs.map(d=>({id:d.id,...d.data(),createdMs:d.data().createdAt?.toMillis?.()||0}));
  render();
}, err=>{
  carousel.innerHTML=`<div class="empty">Firebase設定を確認してください。<br>${escapeHtml(err.message)}</div>`;
});

carousel.addEventListener("click", async e=>{
  const btn=e.target.closest(".like"); if(!btn || btn.disabled)return;
  const id=btn.dataset.id;
  btn.disabled=true;
  localStorage.setItem(likedKey(id),"1");
  try{await updateDoc(doc(db,"wishes",id),{likes:increment(1)});}
  catch(err){localStorage.removeItem(likedKey(id));btn.disabled=false;alert("いいねに失敗しました");}
});

form.addEventListener("submit", async e=>{
  e.preventDefault();
  const name=document.querySelector("#name").value.trim();
  const grade=document.querySelector("#grade").value;
  const wish=document.querySelector("#wish").value.trim();
  if(!name||!grade||!wish)return;
  status.textContent="投稿中…";
  try{
    await addDoc(wishesRef,{name,grade,wish,likes:0,createdAt:serverTimestamp()});
    form.reset(); status.textContent="願い事を投稿しました ✨";
  }catch(err){status.textContent="投稿できませんでした。Firebase設定を確認してください。";}
});

document.querySelectorAll(".sort button").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".sort button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");sortMode=btn.dataset.sort;render();
}));

document.querySelector("#prev").onclick=()=>carousel.scrollBy({left:-284,behavior:"smooth"});
document.querySelector("#next").onclick=()=>carousel.scrollBy({left:284,behavior:"smooth"});
